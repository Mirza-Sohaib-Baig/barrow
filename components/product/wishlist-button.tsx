"use client";

import { Heart } from "lucide-react";
import { useState } from "react";
import { iconButtonClass } from "@/components/product/metrics";
import { cn } from "@/lib/utils";

export function WishlistButton({
  productId,
  saved = false,
  className,
}: {
  productId: string;
  saved?: boolean;
  className?: string;
}) {
  const [pressed, setPressed] = useState(saved);
  const label = pressed ? "Remove from wishlist" : "Add to wishlist";

  return (
    <button
      type="button"
      data-product-id={productId}
      aria-pressed={pressed}
      aria-label={label}
      onClick={() => setPressed((value) => !value)}
      className={cn(iconButtonClass, className)}
    >
      <Heart className={cn("size-4", pressed && "fill-current")} aria-hidden="true" />
    </button>
  );
}
