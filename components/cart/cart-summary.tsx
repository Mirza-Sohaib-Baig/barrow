import Link from "next/link";
import { FreeShippingBar } from "@/components/cart/free-shipping";
import { buttonVariants } from "@/components/ui/button";
import { formatPrice } from "@/lib/format";
import type { PriceQuote } from "@/lib/pricing";
import { cn } from "@/lib/utils";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-body">
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}

export function CartSummary({ quote, pending }: { quote: PriceQuote; pending: boolean }) {
  return (
    <aside className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-6">
      <h2 className="text-h3">Summary</h2>
      <FreeShippingBar amountToFreeShipping={quote.amountToFreeShipping} />
      <div className="flex flex-col gap-2">
        <SummaryRow label="Subtotal" value={formatPrice(quote.subtotal)} />
        <SummaryRow label="Shipping" value={formatPrice(quote.shipping)} />
        <p className="text-small text-muted-foreground">Includes {formatPrice(quote.tax)} VAT</p>
        <SummaryRow label="Total" value={formatPrice(quote.total)} />
      </div>
      <Link
        href="/checkout"
        aria-disabled={pending}
        tabIndex={pending ? -1 : undefined}
        className={cn(
          buttonVariants({ className: "h-11 w-full" }),
          pending && "pointer-events-none opacity-50",
        )}
      >
        Checkout
      </Link>
    </aside>
  );
}
