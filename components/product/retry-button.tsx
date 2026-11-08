"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cartButtonClass } from "@/components/product/metrics";
import { cn } from "@/lib/utils";

export function RetryButton() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className={cn(cartButtonClass, "w-auto")}
      disabled={pending}
      aria-busy={pending}
      onClick={() => {
        startTransition(() => {
          router.refresh();
        });
      }}
    >
      Try again
    </button>
  );
}
