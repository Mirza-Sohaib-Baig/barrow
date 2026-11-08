import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { deriveOrderStatus, type OrderStatusInput } from "@/lib/order-status";

const placedAt = new Date("2026-01-01T00:00:00.000Z");
const MS_PER_HOUR = 60 * 60 * 1000;

function at(hours: number, extraMs = 0): Date {
  return new Date(placedAt.getTime() + hours * MS_PER_HOUR + extraMs);
}

function status(
  now: Date,
  overrides: Partial<Pick<OrderStatusInput, "cancelledAt" | "returnRequestedAt">> = {},
) {
  return deriveOrderStatus({
    placedAt,
    now,
    cancelledAt: overrides.cancelledAt ?? null,
    returnRequestedAt: overrides.returnRequestedAt ?? null,
  });
}

describe("deriveOrderStatus", () => {
  it("locks the age boundaries used by the shop", () => {
    expect(config.orderStatusHours).toEqual({
      packed: 4,
      shipped: 24,
      outForDelivery: 48,
      delivered: 72,
    });
  });

  it("maps each age boundary", () => {
    const { packed, shipped, outForDelivery, delivered } = config.orderStatusHours;

    expect(status(placedAt)).toBe("PLACED");
    expect(status(at(packed, -1))).toBe("PLACED");
    expect(status(at(packed))).toBe("PACKED");
    expect(status(at(shipped, -1))).toBe("PACKED");
    expect(status(at(shipped))).toBe("SHIPPED");
    expect(status(at(outForDelivery, -1))).toBe("SHIPPED");
    expect(status(at(outForDelivery))).toBe("OUT_FOR_DELIVERY");
    expect(status(at(delivered, -1))).toBe("OUT_FOR_DELIVERY");
    expect(status(at(delivered))).toBe("DELIVERED");
    expect(status(at(delivered + 24))).toBe("DELIVERED");
  });

  it("treats a future placedAt as PLACED", () => {
    expect(status(at(-1))).toBe("PLACED");
  });

  it("lets cancellation override age and an open return", () => {
    expect(status(placedAt, { cancelledAt: placedAt })).toBe("CANCELLED");
    expect(status(at(100), { cancelledAt: placedAt })).toBe("CANCELLED");
    expect(
      status(at(100), {
        cancelledAt: placedAt,
        returnRequestedAt: placedAt,
      }),
    ).toBe("CANCELLED");
  });

  it("lets a return request override age when the order is not cancelled", () => {
    expect(status(placedAt, { returnRequestedAt: placedAt })).toBe("RETURN_REQUESTED");
    expect(status(at(100), { returnRequestedAt: placedAt })).toBe("RETURN_REQUESTED");
  });
});
