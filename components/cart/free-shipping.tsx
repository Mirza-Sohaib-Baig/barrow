import { config } from "@/lib/config";
import { formatPrice } from "@/lib/format";

export function FreeShippingBar({ amountToFreeShipping }: { amountToFreeShipping: number }) {
  const threshold = config.freeShippingThreshold;
  const reached = Math.max(0, threshold - amountToFreeShipping);
  const progress = Math.min(1, reached / threshold);
  const qualified = amountToFreeShipping <= 0;
  const message = qualified
    ? "You have free standard delivery"
    : `Add ${formatPrice(amountToFreeShipping)} for free standard delivery`;

  return (
    <div className="flex flex-col gap-2">
      <p className="text-small text-muted-foreground">{message}</p>
      <div
        className="h-1 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={threshold}
        aria-valuenow={reached}
        aria-label={message}
      >
        <div className="h-full bg-primary" style={{ width: `${progress * 100}%` }} />
      </div>
    </div>
  );
}
