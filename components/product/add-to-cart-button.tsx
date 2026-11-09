"use client";

import { startTransition, useOptimistic } from "react";
import { toast } from "sonner";
import { addToCart } from "@/actions/cart";
import { useCartCount } from "@/components/cart/cart-provider";
import { cartButtonClass } from "@/components/product/metrics";

export function AddToCartButton({
  productId,
  outOfStock = false,
}: {
  productId: string;
  outOfStock?: boolean;
}) {
  const { count, previewCount, setCount } = useCartCount();
  const [pending, setPending] = useOptimistic(false);

  function add() {
    const previous = count;
    startTransition(async () => {
      setPending(true);
      previewCount(previous + 1);
      const result = await addToCart({ productId, quantity: 1 });
      if (!result.ok) {
        setCount(previous);
        toast.error(result.error);
        return;
      }
      setCount(result.data.cartCount);
      toast.success("Added to cart");
    });
  }

  return (
    <button
      type="button"
      data-product-id={productId}
      className={cartButtonClass}
      disabled={outOfStock || pending}
      aria-label={outOfStock ? "Out of stock" : "Add to cart"}
      onClick={add}
    >
      Add to cart
    </button>
  );
}
