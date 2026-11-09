import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutSkeleton } from "@/components/checkout/checkout-skeleton";
import { focusRingClass } from "@/components/product/metrics";
import { getSession } from "@/lib/auth";
import { config } from "@/lib/config";
import { formatDate, formatPrice } from "@/lib/format";
import { getOwnedOrder } from "@/lib/queries/orders";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ orderNumber: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { orderNumber } = await params;
  return { title: `Order ${orderNumber} · ${config.siteName}` };
}

function placedLabel(value: Date): string {
  const placed = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(placed.getTime())) return "";
  return formatDate(placed);
}

async function OrderContent({ params }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/signin?next=/orders");

  const { orderNumber } = await params;
  const order = await getOwnedOrder(session.userId, orderNumber);
  if (!order) notFound();

  const address = order.shippingAddress;
  const speed = config.shippingOptions.find((option) => option.id === order.shippingOption);

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Order placed</h1>
        <p className="text-body text-muted-foreground">
          <span data-testid="order-number">{order.orderNumber}</span>
          {placedLabel(order.placedAt) ? ` · ${placedLabel(order.placedAt)}` : ""}
        </p>
      </div>
      <ul className="flex flex-col gap-4">
        {order.items.map((item) => (
          <li key={item.id} className="flex gap-4">
            <span className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              {item.imageUrl ? (
                <Image src={item.imageUrl} alt="" fill sizes="80px" className="object-cover" />
              ) : null}
            </span>
            <span className="flex min-w-0 flex-1 flex-col gap-1">
              <span className="text-body">{item.title}</span>
              <span className="text-small text-muted-foreground">Qty {item.quantity}</span>
            </span>
            <span className="tnum text-body">{formatPrice(item.unitPriceInPence * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2 text-body">
        <p className="flex justify-between gap-4">
          <span>Shipping</span>
          <span>{order.shippingInPence === 0 ? "Free" : formatPrice(order.shippingInPence)}</span>
        </p>
        <p className="text-small text-muted-foreground">
          {speed?.label ?? "Delivery"} · includes {formatPrice(order.taxInPence)} VAT
        </p>
        <p className="flex justify-between gap-4 text-h3">
          <span>Total</span>
          <span className="tnum">{formatPrice(order.totalInPence)}</span>
        </p>
        <p className="text-small text-muted-foreground">Card ending {order.paymentLast4}</p>
      </div>
      <address className="text-body not-italic">
        {address.fullName}
        <br />
        {address.line1}
        {address.line2 ? (
          <>
            <br />
            {address.line2}
          </>
        ) : null}
        <br />
        {address.city} {address.postcode}
      </address>
      <Link href="/" className={cn("w-fit text-body underline", focusRingClass)}>
        Back to the shop
      </Link>
    </div>
  );
}

export default function OrderPage({ params }: PageProps) {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <OrderContent params={params} />
    </Suspense>
  );
}
