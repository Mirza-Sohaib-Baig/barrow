import { createHash } from "node:crypto";
import type { CheckoutLine } from "@/lib/checkout";

export function checkoutFingerprint(lines: CheckoutLine[]): string {
  const body = lines
    .map((line) => `${line.productId}:${line.quantity}:${line.unitPriceInPence}`)
    .sort()
    .join("|");
  return createHash("sha256").update(body).digest("hex");
}
