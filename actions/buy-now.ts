"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { products } from "@/drizzle/schema";
import { outOfStockMessage } from "@/lib/cart-items";
import { getSession } from "@/lib/auth";
import { writeBuyNow } from "@/lib/buy-now";
import { db } from "@/lib/db";

const buySchema = z.object({
  productId: z.uuid(),
  quantity: z.int().min(1).max(99).default(1),
});

export async function startBuyNow(
  input: unknown,
): Promise<{ ok: true; data: { href: string } } | { ok: false; error: string }> {
  const parsed = buySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Choose a quantity from 1 to 99." };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to buy now." };

  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      stock: products.stock,
    })
    .from(products)
    .where(eq(products.id, parsed.data.productId))
    .limit(1);

  if (!product) return { ok: false, error: "That product is no longer available." };
  if (product.stock < parsed.data.quantity) return { ok: false, error: outOfStockMessage(product.title) };

  await writeBuyNow({
    sessionId: session.sessionId,
    productId: product.id,
    quantity: parsed.data.quantity,
  });

  return { ok: true, data: { href: "/checkout?buy=1" } };
}
