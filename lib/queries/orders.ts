import { and, asc, eq } from "drizzle-orm";
import { orderItems, orders, type AddressSnapshot } from "@/drizzle/schema";
import { db } from "@/lib/db";

export type OwnedOrderItem = {
  id: string;
  title: string;
  imageUrl: string;
  unitPriceInPence: number;
  quantity: number;
};

export type OwnedOrder = {
  orderNumber: string;
  placedAt: Date;
  subtotalInPence: number;
  shippingInPence: number;
  taxInPence: number;
  totalInPence: number;
  shippingOption: string;
  shippingAddress: AddressSnapshot;
  paymentLast4: string;
  items: OwnedOrderItem[];
};

export async function getOwnedOrder(
  userId: string,
  orderNumber: string,
): Promise<OwnedOrder | null> {
  const [order] = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      placedAt: orders.placedAt,
      subtotalInPence: orders.subtotalInPence,
      shippingInPence: orders.shippingInPence,
      taxInPence: orders.taxInPence,
      totalInPence: orders.totalInPence,
      shippingOption: orders.shippingOption,
      shippingAddress: orders.shippingAddress,
      paymentLast4: orders.paymentLast4,
    })
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.orderNumber, orderNumber)))
    .limit(1);

  if (!order) return null;

  const items = await db
    .select({
      id: orderItems.id,
      title: orderItems.productTitle,
      imageUrl: orderItems.imageUrl,
      unitPriceInPence: orderItems.unitPriceInPence,
      quantity: orderItems.quantity,
    })
    .from(orderItems)
    .where(eq(orderItems.orderId, order.id))
    .orderBy(asc(orderItems.productTitle), asc(orderItems.id));

  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt,
    subtotalInPence: order.subtotalInPence,
    shippingInPence: order.shippingInPence,
    taxInPence: order.taxInPence,
    totalInPence: order.totalInPence,
    shippingOption: order.shippingOption,
    shippingAddress: order.shippingAddress,
    paymentLast4: order.paymentLast4,
    items,
  };
}
