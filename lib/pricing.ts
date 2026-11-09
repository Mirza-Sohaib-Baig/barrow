import { config } from "@/lib/config";

export type PricedLine = {
  unitPriceInPence: number;
  quantity: number;
};

export type PriceQuote = {
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  amountToFreeShipping: number;
};

function isBillable(line: PricedLine): boolean {
  return (
    Number.isInteger(line.quantity) &&
    line.quantity > 0 &&
    Number.isInteger(line.unitPriceInPence)
  );
}

function shippingPence(optionId: string, subtotal: number): number {
  const standard = config.shippingOptions.find((option) => option.id === "standard");
  const selected =
    config.shippingOptions.find((option) => option.id === optionId) ?? standard;
  if (!selected) return 0;
  if (selected.id === "standard" && subtotal >= config.freeShippingThreshold) return 0;
  return selected.pricePence;
}

function includedVat(grossPence: number): number {
  const rate = config.taxRate;
  return Math.round((grossPence * rate) / (1 + rate));
}

export function quoteCart(lines: PricedLine[], shippingOptionId: string): PriceQuote {
  let subtotal = 0;
  let hasBillable = false;

  for (const line of lines) {
    if (!isBillable(line)) continue;
    hasBillable = true;
    subtotal += line.unitPriceInPence * line.quantity;
  }

  const shipping = hasBillable ? shippingPence(shippingOptionId, subtotal) : 0;
  const total = subtotal + shipping;
  const tax = hasBillable ? includedVat(total) : 0;

  return {
    subtotal,
    shipping,
    tax,
    total,
    amountToFreeShipping: Math.max(0, config.freeShippingThreshold - subtotal),
  };
}
