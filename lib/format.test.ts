import { describe, expect, it } from "vitest";
import { formatDate, formatPrice, formatRelative } from "@/lib/format";

describe("formatPrice", () => {
  it("formats integer pence as GBP", () => {
    expect(formatPrice(0)).toBe("£0.00");
    expect(formatPrice(399)).toBe("£3.99");
    expect(formatPrice(3500)).toBe("£35.00");
    expect(formatPrice(123456)).toBe("£1,234.56");
    expect(formatPrice(-599)).toBe("-£5.99");
  });
});

describe("formatDate", () => {
  it("formats a calendar date in en-GB", () => {
    expect(formatDate(new Date("2026-11-09T12:00:00.000Z"))).toBe("9 Nov 2026");
  });
});

describe("formatRelative", () => {
  it("formats a day offset from a fixed clock", () => {
    const now = new Date("2026-11-09T12:00:00.000Z");
    const then = new Date("2026-11-07T12:00:00.000Z");
    expect(formatRelative(then, now)).toBe("2 days ago");
  });
});
