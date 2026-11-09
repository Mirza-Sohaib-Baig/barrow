"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { and, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { addresses, cartItems, orderItems, orders, products } from "@/drizzle/schema";
import { outOfStockMessage } from "@/lib/cart-items";
import { getSession } from "@/lib/auth";
import { clearBuyNow } from "@/lib/buy-now";
import { checkoutFingerprint } from "@/lib/checkout-fingerprint";
import { isShippingOption, quoteCheckout, type CheckoutMode } from "@/lib/checkout";
import { db } from "@/lib/db";
import { withWriteTransaction } from "@/lib/db-write";
import { getCheckoutLines } from "@/lib/queries/checkout";
import { stripeClient } from "@/lib/stripe";

const placeSchema = z.object({
  paymentIntentId: z
    .string()
    .trim()
    .min(3)
    .max(255)
    .refine((value) => value.startsWith("pi_"), "Payment reference is not valid."),
});

class CheckoutStop extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutStop";
  }
}

function asInt(value: unknown): number {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.trunc(number);
}

function metadataValue(value: string | undefined): string {
  return value ?? "";
}

function nextOrderNumber(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  let body = "";
  for (const byte of bytes) {
    body += alphabet[byte % alphabet.length] ?? "B";
  }
  return `B-${body}`;
}

function duplicatePayment(error: unknown): boolean {
  const parts: string[] = [];
  if (error instanceof Error) {
    parts.push(error.message);
    if (error.cause instanceof Error) parts.push(error.cause.message);
  }
  const text = parts.join(" ");
  return text.includes("orders_payment_intent_id") || text.includes("duplicate key");
}

async function existingOrderNumber(userId: string, paymentIntentId: string): Promise<string | null> {
  const [row] = await db
    .select({ orderNumber: orders.orderNumber })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.paymentIntentId, paymentIntentId)))
    .limit(1);
  return row?.orderNumber ?? null;
}

export async function placeOrder(
  input: unknown,
): Promise<{ ok: true; data: { orderNumber: string } } | { ok: false; error: string }> {
  const parsed = placeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "We could not match this payment. Try again." };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to continue." };

  const already = await existingOrderNumber(session.userId, parsed.data.paymentIntentId);
  if (already) return { ok: true, data: { orderNumber: already } };

  const stripe = stripeClient();
  const intent = await stripe.paymentIntents.retrieve(parsed.data.paymentIntentId, {
    expand: ["payment_method"],
  });

  if (metadataValue(intent.metadata.userId) !== session.userId) {
    return { ok: false, error: "We could not match this payment. Try again." };
  }
  if (intent.status !== "succeeded") {
    return { ok: false, error: "The payment has not completed." };
  }
  if (intent.currency !== "gbp") {
    return { ok: false, error: "We could not match this payment. Try again." };
  }

  const mode = metadataValue(intent.metadata.mode);
  if (mode !== "cart" && mode !== "buy") {
    return { ok: false, error: "We could not match this payment. Try again." };
  }
  const shippingOptionId = metadataValue(intent.metadata.shippingOptionId);
  if (!isShippingOption(shippingOptionId)) {
    return { ok: false, error: "Choose a delivery speed." };
  }

  const checkoutMode: CheckoutMode = mode;
  const lines = await getCheckoutLines(checkoutMode, session.userId, session.sessionId);
  if (lines.length === 0) {
    return {
      ok: false,
      error:
        checkoutMode === "buy"
          ? "Buy now expired. Your cart was not changed."
          : "Your cart changed, so the order was not placed. Your cart is unchanged.",
    };
  }
  if (checkoutFingerprint(lines) !== metadataValue(intent.metadata.fingerprint)) {
    return {
      ok: false,
      error: "Your cart changed, so the order was not placed. Your cart is unchanged.",
    };
  }

  const quote = quoteCheckout(lines, shippingOptionId);
  if (intent.amount !== quote.total) {
    return {
      ok: false,
      error: "The total changed, so the order was not placed. Your cart is unchanged.",
    };
  }

  const addressId = metadataValue(intent.metadata.addressId);
  const [address] = await db
    .select({
      fullName: addresses.fullName,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      postcode: addresses.postcode,
      country: addresses.country,
      phone: addresses.phone,
    })
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, session.userId)))
    .limit(1);
  if (!address) return { ok: false, error: "Choose a delivery address." };

  const method = intent.payment_method;
  const last4 =
    method && typeof method !== "string" && method.card?.last4 ? method.card.last4 : null;
  if (!last4) return { ok: false, error: "We could not read the card used for this payment." };

  const slugs = new Set<string>();
  try {
    const orderNumber = await withWriteTransaction(async (tx) => {
      const locked = await tx
        .select({
          id: products.id,
          slug: products.slug,
          title: products.title,
          stock: products.stock,
        })
        .from(products)
        .where(inArray(products.id, lines.map((line) => line.productId)))
        .for("update");

      const byId = new Map(locked.map((row) => [row.id, row]));
      for (const line of lines) {
        const row = byId.get(line.productId);
        if (!row || asInt(row.stock) < line.quantity) {
          throw new CheckoutStop(outOfStockMessage(line.title));
        }
        slugs.add(row.slug);
      }

      for (const line of lines) {
        const updated = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${line.quantity}` })
          .where(and(eq(products.id, line.productId), gte(products.stock, line.quantity)))
          .returning({ id: products.id });
        if (updated.length === 0) throw new CheckoutStop(outOfStockMessage(line.title));
      }

      const number = nextOrderNumber();
      const [order] = await tx
        .insert(orders)
        .values({
          orderNumber: number,
          userId: session.userId,
          subtotalInPence: quote.subtotal,
          shippingInPence: quote.shipping,
          taxInPence: quote.tax,
          totalInPence: quote.total,
          shippingOption: shippingOptionId,
          shippingAddress: address,
          paymentIntentId: intent.id,
          paymentLast4: last4,
          placedAt: new Date(),
        })
        .returning({ id: orders.id, orderNumber: orders.orderNumber });
      if (!order) throw new Error("Order was not created");

      await tx.insert(orderItems).values(
        lines.map((line) => ({
          orderId: order.id,
          productId: line.productId,
          productTitle: line.title,
          imageUrl: line.image ?? "",
          unitPriceInPence: line.unitPriceInPence,
          quantity: line.quantity,
        })),
      );

      if (checkoutMode === "cart") {
        await tx.delete(cartItems).where(
          and(
            eq(cartItems.userId, session.userId),
            eq(cartItems.savedForLater, false),
            isNull(cartItems.sessionKey),
            inArray(cartItems.productId, lines.map((line) => line.productId)),
          ),
        );
      }

      return order.orderNumber;
    });

    if (checkoutMode === "buy") await clearBuyNow();
    revalidatePath("/cart");
    for (const slug of slugs) {
      revalidateTag(`product:${slug}`, "max");
    }
    revalidateTag("catalogue", "max");
    return { ok: true, data: { orderNumber } };
  } catch (error) {
    if (error instanceof CheckoutStop) return { ok: false, error: error.message };
    if (duplicatePayment(error)) {
      const orderNumber = await existingOrderNumber(session.userId, intent.id);
      if (orderNumber) return { ok: true, data: { orderNumber } };
    }
    throw error;
  }
}
