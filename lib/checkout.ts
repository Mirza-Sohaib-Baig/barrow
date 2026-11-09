import type { AddressSnapshot } from "@/drizzle/schema";
import { config } from "@/lib/config";
import { deliveryWindow, formatDeliveryWindow } from "@/lib/delivery";
import { quoteCart, type PriceQuote } from "@/lib/pricing";

export type CheckoutMode = "cart" | "buy";

export type CheckoutLine = {
  productId: string;
  slug: string;
  title: string;
  image: string | null;
  unitPriceInPence: number;
  quantity: number;
  stock: number;
};

export type CheckoutAddress = AddressSnapshot & {
  id: string;
  isDefault: boolean;
};

export type ShippingChoice = {
  id: string;
  label: string;
  pricePence: number;
  arrival: string;
};

export type CheckoutDraft = {
  mode: CheckoutMode;
  lines: CheckoutLine[];
  addresses: CheckoutAddress[];
  shipping: ShippingChoice[];
  publishableKey: string;
};

export function quoteCheckout(lines: CheckoutLine[], shippingOptionId: string): PriceQuote {
  return quoteCart(
    lines.map((line) => ({
      unitPriceInPence: line.unitPriceInPence,
      quantity: line.quantity,
    })),
    shippingOptionId,
  );
}

export function shippingChoices(now: Date): ShippingChoice[] {
  return config.shippingOptions.map((option) => ({
    id: option.id,
    label: option.label,
    pricePence: option.pricePence,
    arrival: formatDeliveryWindow(deliveryWindow(option, now)),
  }));
}

export function isShippingOption(value: string): boolean {
  return config.shippingOptions.some((option) => option.id === value);
}

export function shortStock(lines: CheckoutLine[]): CheckoutLine | null {
  for (const line of lines) {
    if (line.stock < line.quantity) return line;
  }
  return null;
}
