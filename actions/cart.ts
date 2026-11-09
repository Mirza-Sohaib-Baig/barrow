"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  addToActiveCart,
  clearActiveCart,
  findProduct,
  missingLineMessage,
  missingProductMessage,
  moveOwnedLine,
  outOfStockMessage,
  removeOwnedLine,
  updateOwnedQuantity,
} from "@/lib/cart-items";
import { readCartOwner, writeCartOwner, type CartOwner } from "@/lib/cart-owner";
import { getCart, getOwnedCart, getSavedForLater, type CartLine } from "@/lib/queries/cart";
import type { PriceQuote } from "@/lib/pricing";

const addSchema = z.object({
  productId: z.uuid(),
  quantity: z.int().min(1).max(99).default(1),
});

const lineSchema = z.object({
  lineId: z.uuid(),
});

const quantitySchema = z.object({
  lineId: z.uuid(),
  quantity: z.int().min(0).max(99),
});

export type CartSnapshot = {
  cartCount: number;
  quote: PriceQuote;
  lines: CartLine[];
  saved: CartLine[];
};

export type CartActionResult =
  | { ok: true; data: CartSnapshot }
  | { ok: false; error: string };

function issueOn(error: z.ZodError, field: string): boolean {
  return error.issues.some((issue) => issue.path[0] === field);
}

async function succeed(owner: CartOwner | null): Promise<CartActionResult> {
  const [cart, saved] = await Promise.all([
    getOwnedCart(owner, "standard"),
    owner ? getSavedForLater() : Promise.resolve([]),
  ]);
  revalidatePath("/cart");
  return { ok: true, data: { cartCount: cart.count, quote: cart.quote, lines: cart.lines, saved } };
}

export async function readCartState(): Promise<{ ok: true; data: CartSnapshot }> {
  const owner = await readCartOwner();
  const result = await succeed(owner);
  if (!result.ok) {
    return { ok: true, data: { cartCount: 0, quote: (await getCart()).quote, lines: [], saved: [] } };
  }
  return result;
}

export async function addToCart(input: unknown): Promise<CartActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: issueOn(parsed.error, "productId")
        ? missingProductMessage
        : "Enter a quantity from 1 to 99.",
    };
  }

  const product = await findProduct(parsed.data.productId);
  if (!product) return { ok: false, error: missingProductMessage };
  if (product.stock <= 0) return { ok: false, error: outOfStockMessage(product.title) };

  const owner = await writeCartOwner();
  const written = await addToActiveCart(owner, product, parsed.data.quantity);
  if (!written.ok) return written;
  return succeed(owner);
}

export async function updateQuantity(input: unknown): Promise<CartActionResult> {
  const parsed = quantitySchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: issueOn(parsed.error, "lineId")
        ? missingLineMessage
        : "Enter a quantity from 0 to 99.",
    };
  }

  const owner = await readCartOwner();
  if (!owner) return { ok: false, error: missingLineMessage };
  const written = await updateOwnedQuantity(owner, parsed.data.lineId, parsed.data.quantity);
  if (!written.ok) return written;
  return succeed(owner);
}

export async function removeFromCart(input: unknown): Promise<CartActionResult> {
  const parsed = lineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: missingLineMessage };
  const owner = await readCartOwner();
  if (!owner) return { ok: false, error: missingLineMessage };
  const written = await removeOwnedLine(owner, parsed.data.lineId);
  if (!written.ok) return written;
  return succeed(owner);
}

export async function moveToSaved(input: unknown): Promise<CartActionResult> {
  const parsed = lineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: missingLineMessage };
  const owner = await readCartOwner();
  if (!owner) return { ok: false, error: missingLineMessage };
  const written = await moveOwnedLine(owner, parsed.data.lineId, true);
  if (!written.ok) return written;
  return succeed(owner);
}

export async function moveToCart(input: unknown): Promise<CartActionResult> {
  const parsed = lineSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: missingLineMessage };
  const owner = await readCartOwner();
  if (!owner) return { ok: false, error: missingLineMessage };
  const written = await moveOwnedLine(owner, parsed.data.lineId, false);
  if (!written.ok) return written;
  return succeed(owner);
}

export async function clearCart(input?: unknown): Promise<CartActionResult> {
  void input;
  const owner = await readCartOwner();
  if (owner) await clearActiveCart(owner);
  return succeed(owner);
}
