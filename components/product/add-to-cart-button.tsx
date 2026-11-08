"use client";

import { useState } from "react";
import { cartButtonClass } from "@/components/product/metrics";

export function AddToCartButton({
  productId,
  outOfStock = false,
}: {
  productId: string;
  outOfStock?: boolean;
}) {
  const [added, setAdded] = useState(false);

  return (
    <>
      <button
        type="button"
        data-product-id={productId}
        className={cartButtonClass}
        disabled={outOfStock || added}
        aria-label={outOfStock ? "Out of stock" : "Add to cart"}
        onClick={() => setAdded(true)}
      >
        Add to cart
      </button>
      <span className="sr-only" aria-live="polite">
        {added ? "Added to cart" : ""}
      </span>
    </>
  );
}
