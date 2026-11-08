import { config } from "@/lib/config";

export const orderStatuses = [
  "PLACED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
] as const;

export type OrderStatus = (typeof orderStatuses)[number];

export type OrderStatusInput = {
  placedAt: Date;
  now: Date;
  cancelledAt: Date | null;
  returnRequestedAt: Date | null;
};

const MS_PER_HOUR = 60 * 60 * 1000;

export function deriveOrderStatus(input: OrderStatusInput): OrderStatus {
  if (input.cancelledAt) {
    return "CANCELLED";
  }
  if (input.returnRequestedAt) {
    return "RETURN_REQUESTED";
  }

  const ageMs = input.now.getTime() - input.placedAt.getTime();
  const bounds = config.orderStatusHours;

  if (ageMs < bounds.packed * MS_PER_HOUR) {
    return "PLACED";
  }
  if (ageMs < bounds.shipped * MS_PER_HOUR) {
    return "PACKED";
  }
  if (ageMs < bounds.outForDelivery * MS_PER_HOUR) {
    return "SHIPPED";
  }
  if (ageMs < bounds.delivered * MS_PER_HOUR) {
    return "OUT_FOR_DELIVERY";
  }
  return "DELIVERED";
}
