"use client";

import { cartButtonClass } from "@/components/product/metrics";

export default function SiteError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div role="alert" className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-4">
      <h1 className="text-h1">The shop didn&apos;t load</h1>
      <p className="text-body text-muted-foreground">Check your connection and try again.</p>
      <button type="button" className={cartButtonClass} onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
