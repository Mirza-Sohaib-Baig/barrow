"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { wishlistItems } from "@/drizzle/schema";
import {
  addToActiveCart,
  findProduct,
  missingProductMessage,
  outOfStockMessage,
} from "@/lib/cart-items";
import { writeCartOwner } from "@/lib/cart-owner";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import type { PriceQuote } from "@/lib/pricing";
import { getOwnedCart } from "@/lib/queries/cart";

const productSchema = z.object({
  productId: z.uuid(),
});

const signInMessage = "Sign in to save items.";
const missingWishMessage = "That item is no longer in your wishlist.";

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== "object" || error === null) return false;
  if ("code" in error && error.code === "23505") return true;
  if ("cause" in error) return isUniqueViolation(error.cause);
  return false;
}

export async function toggleWishlist(
  input: unknown,
): Promise<{ ok: true; data: { saved: boolean } } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: signInMessage };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: missingProductMessage };

  const [existing] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, session.userId),
        eq(wishlistItems.productId, parsed.data.productId),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .delete(wishlistItems)
      .where(and(eq(wishlistItems.userId, session.userId), eq(wishlistItems.id, existing.id)));
    return { ok: true, data: { saved: false } };
  }

  const product = await findProduct(parsed.data.productId);
  if (!product) return { ok: false, error: missingProductMessage };

  try {
    await db.insert(wishlistItems).values({
      userId: session.userId,
      productId: product.id,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
  }

  return { ok: true, data: { saved: true } };
}

export async function moveWishlistToCart(
  input: unknown,
): Promise<{ ok: true; data: { cartCount: number; quote: PriceQuote } } | { ok: false; error: string }> {
  const session = await getSession();
  if (!session) return { ok: false, error: signInMessage };

  const parsed = productSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: missingWishMessage };

  const [wish] = await db
    .select({ id: wishlistItems.id })
    .from(wishlistItems)
    .where(
      and(
        eq(wishlistItems.userId, session.userId),
        eq(wishlistItems.productId, parsed.data.productId),
      ),
    )
    .limit(1);
  if (!wish) return { ok: false, error: missingWishMessage };

  const product = await findProduct(parsed.data.productId);
  if (!product) return { ok: false, error: missingProductMessage };
  if (product.stock <= 0) return { ok: false, error: outOfStockMessage(product.title) };

  const owner = await writeCartOwner();
  const written = await addToActiveCart(owner, product, 1);
  if (!written.ok) return written;

  await db
    .delete(wishlistItems)
    .where(and(eq(wishlistItems.userId, session.userId), eq(wishlistItems.id, wish.id)));

  const cart = await getOwnedCart(owner, "standard");
  revalidatePath("/cart");
  return { ok: true, data: { cartCount: cart.count, quote: cart.quote } };
}
