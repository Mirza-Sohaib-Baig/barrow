import { Suspense } from "react";
import type { Metadata } from "next";
import { CartExperience } from "@/components/cart/cart-experience";
import { CartSkeleton } from "@/components/cart/cart-skeleton";
import { getCart, getSavedForLater } from "@/lib/queries/cart";

export const metadata: Metadata = {
  title: "Your cart",
};

async function CartContent() {
  const [cart, saved] = await Promise.all([getCart(), getSavedForLater()]);
  return <CartExperience cart={cart} saved={saved} />;
}

export default function CartPage() {
  return (
    <Suspense fallback={<CartSkeleton />}>
      <CartContent />
    </Suspense>
  );
}
