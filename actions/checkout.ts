"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { addresses, users, type AddressSnapshot } from "@/drizzle/schema";
import { parseAddress } from "@/lib/address";
import { getSession } from "@/lib/auth";
import { checkoutFingerprint } from "@/lib/checkout-fingerprint";
import { isShippingOption, quoteCheckout, shortStock, type CheckoutMode } from "@/lib/checkout";
import { db } from "@/lib/db";
import { getAddresses } from "@/lib/queries/addresses";
import { getCheckoutLines } from "@/lib/queries/checkout";
import { stripeClient } from "@/lib/stripe";
import { outOfStockMessage } from "@/lib/cart-items";

const addressFields = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  postcode: z.string(),
  phone: z.string(),
});

const paymentSchema = z.object({
  mode: z.enum(["cart", "buy"]),
  shippingOptionId: z.string(),
  addressId: z.uuid().optional(),
  address: addressFields.optional(),
});

export type CheckoutPayment = {
  clientSecret: string;
  paymentIntentId: string;
  amount: number;
  billing: AddressSnapshot & { email: string };
};

export type CheckoutPaymentResult =
  | { ok: true; data: CheckoutPayment }
  | { ok: false; error: string };

async function ownedAddress(
  userId: string,
  addressId: string,
): Promise<(AddressSnapshot & { id: string }) | null> {
  const [row] = await db
    .select({
      id: addresses.id,
      fullName: addresses.fullName,
      line1: addresses.line1,
      line2: addresses.line2,
      city: addresses.city,
      postcode: addresses.postcode,
      country: addresses.country,
      phone: addresses.phone,
    })
    .from(addresses)
    .where(and(eq(addresses.id, addressId), eq(addresses.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function resolveAddress(
  userId: string,
  addressId: string | undefined,
  address: z.infer<typeof addressFields> | undefined,
): Promise<{ ok: true; data: AddressSnapshot & { id: string } } | { ok: false; error: string }> {
  if (addressId) {
    const saved = await ownedAddress(userId, addressId);
    if (!saved) return { ok: false, error: "Choose a delivery address." };
    return { ok: true, data: saved };
  }

  if (!address) return { ok: false, error: "Choose a delivery address." };
  const parsed = parseAddress(address);
  if (!parsed.ok) return { ok: false, error: parsed.error };

  const existing = await getAddresses(userId);
  const match = existing.find(
    (row) =>
      row.fullName === parsed.data.fullName &&
      row.line1 === parsed.data.line1 &&
      row.city === parsed.data.city &&
      row.postcode === parsed.data.postcode &&
      row.phone === parsed.data.phone,
  );
  if (match) return { ok: true, data: match };

  const [created] = await db
    .insert(addresses)
    .values({
      userId,
      ...parsed.data,
      isDefault: existing.length === 0,
    })
    .returning({ id: addresses.id });

  if (!created) return { ok: false, error: "We could not save that address. Try again." };
  return { ok: true, data: { id: created.id, ...parsed.data } };
}

export async function createCheckoutPayment(input: unknown): Promise<CheckoutPaymentResult> {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Check the delivery details and try again." };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to continue." };

  const shippingOptionId = parsed.data.shippingOptionId;
  if (!isShippingOption(shippingOptionId)) {
    return { ok: false, error: "Choose a delivery speed." };
  }

  const mode: CheckoutMode = parsed.data.mode;
  const lines = await getCheckoutLines(mode, session.userId, session.sessionId);
  if (lines.length === 0) {
    return {
      ok: false,
      error:
        mode === "buy"
          ? "Buy now expired. Your cart was not changed."
          : "Your cart is empty.",
    };
  }

  const missing = shortStock(lines);
  if (missing) return { ok: false, error: outOfStockMessage(missing.title) };

  const quote = quoteCheckout(lines, shippingOptionId);
  if (quote.total < 30) return { ok: false, error: "There is nothing to pay." };

  const address = await resolveAddress(session.userId, parsed.data.addressId, parsed.data.address);
  if (!address.ok) return address;

  const [shopper] = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1);
  if (!shopper) return { ok: false, error: "Sign in to continue." };

  const stripe = stripeClient();
  let intent;
  try {
    intent = await stripe.paymentIntents.create({
      amount: quote.total,
      currency: "gbp",
      automatic_payment_methods: { enabled: true },
      metadata: {
        userId: session.userId,
        mode,
        shippingOptionId,
        addressId: address.data.id,
        fingerprint: checkoutFingerprint(lines),
      },
    });
  } catch {
    return { ok: false, error: "We could not start the payment. Try again." };
  }

  if (!intent.client_secret) throw new Error("Stripe did not return a client secret");

  return {
    ok: true,
    data: {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: quote.total,
      billing: {
        fullName: address.data.fullName,
        line1: address.data.line1,
        line2: address.data.line2,
        city: address.data.city,
        postcode: address.data.postcode,
        country: address.data.country,
        phone: address.data.phone,
        email: shopper.email,
      },
    },
  };
}
