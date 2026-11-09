import { describe, expect, it } from "vitest";
import { deliveryWindow, formatDeliveryWindow } from "@/lib/delivery";

describe("deliveryWindow", () => {
  it("adds London calendar days across a month boundary", () => {
    const now = new Date("2026-01-30T22:30:00.000Z");
    const window = deliveryWindow({ minDays: 3, maxDays: 5 }, now);
    expect(formatDeliveryWindow(window)).toBe("Arrives Mon 2 Feb to Wed 4 Feb");
  });

  it("formats a same-day express option as one date", () => {
    const now = new Date("2026-11-12T12:00:00.000Z");
    const window = deliveryWindow({ minDays: 1, maxDays: 1 }, now);
    expect(formatDeliveryWindow(window)).toBe("Arrives Fri 13 Nov");
  });

  it("keeps the London date when a day is added across the spring clock change", () => {
    const now = new Date("2026-03-28T23:30:00.000Z");
    const window = deliveryWindow({ minDays: 1, maxDays: 1 }, now);
    expect(formatDeliveryWindow(window)).toBe("Arrives Sun 29 Mar");
  });
});
