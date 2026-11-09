import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { CheckoutLine } from "@/lib/checkout";
import type { PriceQuote } from "@/lib/pricing";

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 text-body">
      <span>{label}</span>
      <span className="tnum">{value}</span>
    </div>
  );
}

export function OrderSummary({ lines, quote }: { lines: CheckoutLine[]; quote: PriceQuote }) {
  return (
    <aside className="flex h-fit flex-col gap-4 rounded-lg border border-border bg-card p-4 lg:sticky lg:top-6">
      <h2 className="text-h3">Order summary</h2>
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <li key={line.productId} className="flex gap-3">
            <span className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-muted">
              {line.image ? (
                <Image src={line.image} alt="" fill sizes="64px" className="object-cover" />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="line-clamp-2 text-small">{line.title}</span>
              <span className="text-small text-muted-foreground">Qty {line.quantity}</span>
            </span>
            <span className="tnum text-small">{formatPrice(line.unitPriceInPence * line.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2">
        <Row label="Subtotal" value={formatPrice(quote.subtotal)} />
        <Row label="Shipping" value={quote.shipping === 0 ? "Free" : formatPrice(quote.shipping)} />
        <p className="text-small text-muted-foreground">Includes {formatPrice(quote.tax)} VAT</p>
        <Row label="Total" value={formatPrice(quote.total)} />
      </div>
    </aside>
  );
}
