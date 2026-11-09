"use client";

import { Heart } from "lucide-react";
import { startTransition, useOptimistic, useState } from "react";
import { toast } from "sonner";
import { toggleWishlist } from "@/actions/wishlist";
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
  const [savedState, setSavedState] = useState(saved);
  const [pressed, setPressed] = useOptimistic(savedState);
  const label = pressed ? "Remove from wishlist" : "Add to wishlist";

  function toggle() {
    const next = !savedState;
    startTransition(async () => {
      setPressed(next);
      const result = await toggleWishlist({ productId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSavedState(result.data.saved);
      toast.success(result.data.saved ? "Saved" : "Removed from wishlist");
    });
  }

  return (
    <button
      type="button"
      data-product-id={productId}
      aria-pressed={pressed}
      aria-label={label}
      onClick={toggle}
      className={cn(iconButtonClass, className)}
    >
      <Heart className={cn("size-4", pressed && "fill-current")} aria-hidden="true" />
    </button>
  );
}
