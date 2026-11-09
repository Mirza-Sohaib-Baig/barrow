import { CartCountSync } from "@/components/cart/cart-count-sync";
import { getCartCount } from "@/lib/queries/cart";

export async function CartCountSource() {
  const count = await getCartCount();
  return <CartCountSync count={count} />;
}
