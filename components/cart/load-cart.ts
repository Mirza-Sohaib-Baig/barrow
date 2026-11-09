"use server";

import { getCart, getSavedForLater, type CartLine, type CartView } from "@/lib/queries/cart";

export async function loadCartView(): Promise<{ cart: CartView; saved: CartLine[] }> {
  const [cart, saved] = await Promise.all([getCart(), getSavedForLater()]);
  return { cart, saved };
}
