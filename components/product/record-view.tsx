"use client";

import { useEffect } from "react";
import { recordView } from "@/actions/views";

export function RecordView({ productId }: { productId: string }) {
  useEffect(() => {
    void recordView(productId).catch(() => {
      // A missed view must not replace the product page with an error.
    });
  }, [productId]);

  return null;
}
