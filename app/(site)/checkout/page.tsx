import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { CheckoutSkeleton } from "@/components/checkout/checkout-skeleton";
import { focusRingClass } from "@/components/product/metrics";
import { getSession } from "@/lib/auth";
import { shippingChoices, type CheckoutMode } from "@/lib/checkout";
import { config } from "@/lib/config";
import { getAddresses } from "@/lib/queries/addresses";
import { getCheckoutLines } from "@/lib/queries/checkout";
import { stripePublishableKey } from "@/lib/stripe";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: `Checkout · ${config.siteName}`,
};

type PageProps = {
  searchParams: Promise<{ buy?: string | string[] }>;
};

function readMode(value: string | string[] | undefined): CheckoutMode {
  const flag = Array.isArray(value) ? value[0] : value;
  return flag === "1" ? "buy" : "cart";
}

function EmptyCheckout({ mode }: { mode: CheckoutMode }) {
  const expired = mode === "buy";
  return (
    <div className="flex max-w-xl flex-col gap-4">
      <p className="text-body text-muted-foreground">
        {expired
          ? "That buy now request expired. Your cart was not changed."
          : "Your cart is empty. Add something before checking out."}
      </p>
      <Link href={expired ? "/cart" : "/"} className={cn("w-fit text-body underline", focusRingClass)}>
        {expired ? "Back to your cart" : "Continue shopping"}
      </Link>
    </div>
  );
}

async function CheckoutContent({ searchParams }: PageProps) {
  const session = await getSession();
  if (!session) redirect("/signin?next=/checkout");
  await connection();

  const params = await searchParams;
  const mode = readMode(params.buy);
  const [lines, addresses] = await Promise.all([
    getCheckoutLines(mode, session.userId, session.sessionId),
    getAddresses(session.userId),
  ]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-h1">Checkout</h1>
        {mode === "buy" && lines.length > 0 ? (
          <p className="text-body text-muted-foreground">
            Buying this item now. Your cart is unchanged.
          </p>
        ) : null}
      </div>
      {lines.length === 0 ? (
        <EmptyCheckout mode={mode} />
      ) : (
        <CheckoutForm
          draft={{
            mode,
            lines,
            addresses,
            shipping: shippingChoices(new Date()),
            publishableKey: stripePublishableKey(),
          }}
        />
      )}
    </div>
  );
}

export default function CheckoutPage({ searchParams }: PageProps) {
  return (
    <Suspense fallback={<CheckoutSkeleton />}>
      <CheckoutContent searchParams={searchParams} />
    </Suspense>
  );
}
