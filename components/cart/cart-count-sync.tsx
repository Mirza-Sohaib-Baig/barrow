"use client";

import { useEffect } from "react";
import { useCartCount } from "@/components/cart/cart-provider";

export function CartCountSync({ count }: { count: number }) {
  const { adoptServerCount } = useCartCount();

  useEffect(() => {
    adoptServerCount(count);
  }, [adoptServerCount, count]);

  return null;
}
