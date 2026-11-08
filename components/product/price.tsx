import { formatPrice } from "@/lib/format";
import { verifiedSavingPence } from "@/lib/product-card";
import { cn } from "@/lib/utils";

const sizeClass = {
  small: "text-small",
  body: "text-body",
  h3: "text-h3",
} as const;

export function Price({
  priceInPence,
  listPriceInPence = null,
  size = "h3",
  savings = false,
}: {
  priceInPence: number;
  listPriceInPence?: number | null;
  size?: keyof typeof sizeClass;
  savings?: boolean;
}) {
  const saving = savings ? verifiedSavingPence(priceInPence, listPriceInPence) : null;

  return (
    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className={cn("tnum text-(--color-price)", sizeClass[size])}>
        {formatPrice(priceInPence)}
      </span>
      {saving != null && listPriceInPence != null ? (
        <span className="tnum text-small text-muted-foreground line-through">
          {formatPrice(listPriceInPence)}
        </span>
      ) : null}
      {saving != null ? (
        <span className="tnum inline-flex h-5 items-center rounded-full border border-(--color-savings) px-2 text-small whitespace-nowrap text-(--color-savings)">
          Save {formatPrice(saving)}
        </span>
      ) : null}
    </span>
  );
}
