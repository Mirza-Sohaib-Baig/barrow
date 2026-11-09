import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { quoteCart, type PriceQuote } from "@/lib/pricing";

function expectBalanced(quote: PriceQuote) {
  expect(quote.total).toBe(quote.subtotal + quote.shipping);
  expect(quote.amountToFreeShipping).toBe(
    Math.max(0, config.freeShippingThreshold - quote.subtotal),
  );
}

describe("quoteCart", () => {
  it("quotes an empty cart as nothing to ship", () => {
    expect(quoteCart([], "express")).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      amountToFreeShipping: config.freeShippingThreshold,
    });
    expect(
      quoteCart(
        [
          { unitPriceInPence: 1000, quantity: 0 },
          { unitPriceInPence: 1000, quantity: -1 },
          { unitPriceInPence: 10.5, quantity: 2 },
        ],
        "standard",
      ),
    ).toEqual({
      subtotal: 0,
      shipping: 0,
      tax: 0,
      total: 0,
      amountToFreeShipping: 3500,
    });
  });

  it("waives standard shipping at exactly 3500", () => {
    const quote = quoteCart([{ unitPriceInPence: 3500, quantity: 1 }], "standard");
    expect(quote.subtotal).toBe(3500);
    expect(quote.shipping).toBe(0);
    expect(quote.tax).toBe(583);
    expect(quote.total).toBe(3500);
    expect(quote.amountToFreeShipping).toBe(0);
    expectBalanced(quote);
  });

  it("charges standard shipping one penny under the threshold", () => {
    const quote = quoteCart([{ unitPriceInPence: 3499, quantity: 1 }], "standard");
    expect(quote.subtotal).toBe(3499);
    expect(quote.shipping).toBe(399);
    expect(quote.total).toBe(3898);
    expect(quote.tax).toBe(650);
    expect(quote.amountToFreeShipping).toBe(1);
    expectBalanced(quote);
  });

  it("still charges express at the free standard threshold", () => {
    const quote = quoteCart([{ unitPriceInPence: 3500, quantity: 1 }], "express");
    expect(quote.subtotal).toBe(3500);
    expect(quote.shipping).toBe(599);
    expect(quote.total).toBe(4099);
    expect(quote.tax).toBe(683);
    expect(quote.amountToFreeShipping).toBe(0);
    expectBalanced(quote);
  });

  it("rounds included VAT when the fraction is half a penny", () => {
    const gross = 3501;
    const raw = (gross * config.taxRate) / (1 + config.taxRate);
    expect(raw - Math.trunc(raw)).toBeCloseTo(0.5, 8);
    expect(Math.round(raw)).toBe(584);

    const quote = quoteCart([{ unitPriceInPence: gross, quantity: 1 }], "standard");
    expect(quote.subtotal).toBe(3501);
    expect(quote.shipping).toBe(0);
    expect(quote.tax).toBe(Math.round(raw));
    expect(quote.tax).toBe(584);
    expect(quote.total).toBe(3501);
    expect(quote.amountToFreeShipping).toBe(0);
  });

  it("sums a mixed multi-line cart and ignores lines that cannot be priced", () => {
    const quote = quoteCart(
      [
        { unitPriceInPence: 1200, quantity: 2 },
        { unitPriceInPence: 450, quantity: 2 },
        { unitPriceInPence: 10.5, quantity: 4 },
        { unitPriceInPence: 100, quantity: 0 },
        { unitPriceInPence: 100, quantity: -3 },
        { unitPriceInPence: Number.NaN, quantity: 1 },
      ],
      "standard",
    );
    expect(quote.subtotal).toBe(3300);
    expect(quote.shipping).toBe(399);
    expect(quote.total).toBe(3699);
    expect(quote.tax).toBe(Math.round((3699 * config.taxRate) / (1 + config.taxRate)));
    expect(quote.tax).toBe(617);
    expect(quote.amountToFreeShipping).toBe(200);
    expectBalanced(quote);
  });

  it("falls back to standard shipping for an unknown option", () => {
    const quote = quoteCart([{ unitPriceInPence: 1000, quantity: 1 }], "overnight");
    const standard = quoteCart([{ unitPriceInPence: 1000, quantity: 1 }], "standard");
    expect(quote).toEqual(standard);
    expect(quote.shipping).toBe(399);
    expect(quote.subtotal).toBe(1000);
    expect(quote.total).toBe(1399);
    expect(quote.amountToFreeShipping).toBe(2500);
    expectBalanced(quote);
  });
});
