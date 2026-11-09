import { and, eq, inArray } from "drizzle-orm";
import { cartItems, products } from "@/drizzle/schema";
import { cartOwnerWhere, ownerColumns, type CartOwner } from "@/lib/cart-owner";
import { db } from "@/lib/db";

const QUANTITY_CAP = 99;

export type StockedProduct = {
  id: string;
  title: string;
  stock: number;
};

export type ItemResult = { ok: true } | { ok: false; error: string };

export function outOfStockMessage(title: string): string {
  return `${title} is out of stock.`;
}

export const missingLineMessage = "That item is no longer in your cart.";
export const missingProductMessage = "That product is no longer available.";

function capQuantity(quantity: number, stock: number): number {
  return Math.min(quantity, stock, QUANTITY_CAP);
}

export async function findProduct(productId: string): Promise<StockedProduct | null> {
  const [product] = await db
    .select({
      id: products.id,
      title: products.title,
      stock: products.stock,
    })
    .from(products)
    .where(eq(products.id, productId))
    .limit(1);
  return product ?? null;
}

async function linesForProduct(owner: CartOwner, productId: string, savedForLater: boolean) {
  return db
    .select({
      id: cartItems.id,
      quantity: cartItems.quantity,
    })
    .from(cartItems)
    .where(
      and(
        cartOwnerWhere(owner),
        eq(cartItems.productId, productId),
        eq(cartItems.savedForLater, savedForLater),
      ),
    );
}

async function collapseQuantity(
  owner: CartOwner,
  rows: { id: string; quantity: number }[],
  quantity: number,
): Promise<void> {
  const [keep, ...extra] = rows;
  if (!keep) return;
  await db
    .update(cartItems)
    .set({ quantity })
    .where(and(cartOwnerWhere(owner), eq(cartItems.id, keep.id)));
  if (extra.length === 0) return;
  await db.delete(cartItems).where(
    and(
      cartOwnerWhere(owner),
      inArray(
        cartItems.id,
        extra.map((row) => row.id),
      ),
    ),
  );
}

export async function addToActiveCart(
  owner: CartOwner,
  product: StockedProduct,
  quantity: number,
): Promise<ItemResult> {
  if (product.stock <= 0) {
    return { ok: false, error: outOfStockMessage(product.title) };
  }

  const existing = await linesForProduct(owner, product.id, false);
  const current = existing.reduce((sum, row) => sum + row.quantity, 0);
  const next = capQuantity(current + quantity, product.stock);
  if (next <= 0) {
    return { ok: false, error: outOfStockMessage(product.title) };
  }

  if (existing.length === 0) {
    await db.insert(cartItems).values({
      ...ownerColumns(owner),
      productId: product.id,
      quantity: next,
      savedForLater: false,
    });
    return { ok: true };
  }

  await collapseQuantity(owner, existing, next);
  return { ok: true };
}

type OwnedLine = {
  id: string;
  productId: string;
  quantity: number;
  savedForLater: boolean;
  title: string;
  stock: number;
};

async function findOwnedLine(owner: CartOwner, lineId: string): Promise<OwnedLine | null> {
  const [line] = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      savedForLater: cartItems.savedForLater,
      title: products.title,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(products.id, cartItems.productId))
    .where(and(cartOwnerWhere(owner), eq(cartItems.id, lineId)))
    .limit(1);
  return line ?? null;
}

export async function updateOwnedQuantity(
  owner: CartOwner,
  lineId: string,
  quantity: number,
): Promise<ItemResult> {
  const line = await findOwnedLine(owner, lineId);
  if (!line) return { ok: false, error: missingLineMessage };

  if (quantity <= 0) {
    await db
      .delete(cartItems)
      .where(and(cartOwnerWhere(owner), eq(cartItems.id, line.id)));
    return { ok: true };
  }

  if (line.stock <= 0) {
    return { ok: false, error: outOfStockMessage(line.title) };
  }

  const next = capQuantity(quantity, line.stock);
  if (next <= 0) {
    return { ok: false, error: outOfStockMessage(line.title) };
  }

  await db
    .update(cartItems)
    .set({ quantity: next })
    .where(and(cartOwnerWhere(owner), eq(cartItems.id, line.id)));
  return { ok: true };
}

export async function removeOwnedLine(owner: CartOwner, lineId: string): Promise<ItemResult> {
  const removed = await db
    .delete(cartItems)
    .where(and(cartOwnerWhere(owner), eq(cartItems.id, lineId)))
    .returning({ id: cartItems.id });
  if (removed.length === 0) return { ok: false, error: missingLineMessage };
  return { ok: true };
}

export async function moveOwnedLine(
  owner: CartOwner,
  lineId: string,
  savedForLater: boolean,
): Promise<ItemResult> {
  const line = await findOwnedLine(owner, lineId);
  if (!line || line.savedForLater === savedForLater) {
    return { ok: false, error: missingLineMessage };
  }
  if (line.stock <= 0) {
    return { ok: false, error: outOfStockMessage(line.title) };
  }

  const destination = await linesForProduct(owner, line.productId, savedForLater);
  const combined = destination.reduce((sum, row) => sum + row.quantity, 0) + line.quantity;
  const next = capQuantity(combined, line.stock);
  if (next <= 0) {
    return { ok: false, error: outOfStockMessage(line.title) };
  }

  if (destination.length === 0) {
    await db
      .update(cartItems)
      .set({ savedForLater, quantity: next })
      .where(and(cartOwnerWhere(owner), eq(cartItems.id, line.id)));
    return { ok: true };
  }

  await collapseQuantity(owner, destination, next);
  await db
    .delete(cartItems)
    .where(and(cartOwnerWhere(owner), eq(cartItems.id, line.id)));
  return { ok: true };
}

export async function clearActiveCart(owner: CartOwner): Promise<void> {
  await db
    .delete(cartItems)
    .where(and(cartOwnerWhere(owner), eq(cartItems.savedForLater, false)));
}
