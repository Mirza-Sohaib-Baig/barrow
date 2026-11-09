import { and, eq, isNull } from "drizzle-orm";
import { cartItems, products } from "@/drizzle/schema";

function nonNegative(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.trunc(value);
}

export function mergeQuantities(existing: number, incoming: number, stock: number): number {
  const available = nonNegative(stock);
  return Math.min(nonNegative(existing) + nonNegative(incoming), available);
}

function cartRowKey(productId: string, savedForLater: boolean): string {
  return `${productId}:${savedForLater ? "saved" : "cart"}`;
}

export async function mergeGuestCart(userId: string): Promise<void> {
  const { readCartKey, clearCartKey } = await import("@/lib/cart-session");
  const key = await readCartKey();
  if (!key) return;

  const { db } = await import("@/lib/db");
  const guestRows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      savedForLater: cartItems.savedForLater,
      stock: products.stock,
    })
    .from(cartItems)
    .innerJoin(products, eq(cartItems.productId, products.id))
    .where(and(eq(cartItems.sessionKey, key), isNull(cartItems.userId)));

  const userRows = await db
    .select({
      id: cartItems.id,
      productId: cartItems.productId,
      quantity: cartItems.quantity,
      savedForLater: cartItems.savedForLater,
    })
    .from(cartItems)
    .where(eq(cartItems.userId, userId));

  const owned = new Map<string, { id: string; quantity: number }>();
  for (const row of userRows) {
    owned.set(cartRowKey(row.productId, row.savedForLater), {
      id: row.id,
      quantity: row.quantity,
    });
  }

  // neon-http cannot open an interactive transaction, so these writes run in order.
  for (const guest of guestRows) {
    const stock = nonNegative(guest.stock);
    const mapKey = cartRowKey(guest.productId, guest.savedForLater);
    const existing = owned.get(mapKey);

    if (existing) {
      const quantity = mergeQuantities(existing.quantity, guest.quantity, stock);
      await db
        .update(cartItems)
        .set({ quantity })
        .where(and(eq(cartItems.id, existing.id), eq(cartItems.userId, userId)));
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.id, guest.id), eq(cartItems.sessionKey, key), isNull(cartItems.userId)));
      existing.quantity = quantity;
      continue;
    }

    if (stock === 0) {
      await db
        .delete(cartItems)
        .where(and(eq(cartItems.id, guest.id), eq(cartItems.sessionKey, key), isNull(cartItems.userId)));
      continue;
    }

    const quantity = mergeQuantities(0, guest.quantity, stock);
    await db
      .update(cartItems)
      .set({ userId, sessionKey: null, quantity })
      .where(and(eq(cartItems.id, guest.id), eq(cartItems.sessionKey, key), isNull(cartItems.userId)));
    owned.set(mapKey, { id: guest.id, quantity });
  }

  await clearCartKey();
}
