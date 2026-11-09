"use client";

import Link from "next/link";
import { CartToaster } from "@/components/cart/cart-provider";
import { CartLineRow } from "@/components/cart/cart-line";
import { CartSummary } from "@/components/cart/cart-summary";
import { useCartState } from "@/components/cart/use-cart-state";
import { buttonVariants } from "@/components/ui/button";
import { config } from "@/lib/config";
import type { CartLine, CartView } from "@/lib/queries/cart";
import { cn } from "@/lib/utils";

function EmptyCart() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">Your cart is empty.</h1>
        <p className="max-w-xl text-muted-foreground">
          Choose a department and add something when you are ready.
        </p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {config.departments.map((department) => (
          <li key={department.slug}>
            <Link
              href={`/c/${department.slug}`}
              className={cn(buttonVariants({ variant: "outline", className: "h-10 w-full" }))}
            >
              Shop {department.label.toLowerCase()}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CartExperience({ cart, saved }: { cart: CartView; saved: CartLine[] }) {
  const state = useCartState({ lines: cart.lines, saved, quote: cart.quote }, true);

  return (
    <>
      <CartToaster />
      <div className="flex flex-col gap-12">
        {state.lines.length === 0 ? (
          <EmptyCart />
        ) : (
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
            <section>
              <h1 className="text-h1">Your cart</h1>
              <ul aria-label="Cart items" className="mt-6 divide-y divide-border">
                {state.lines.map((line) => (
                  <CartLineRow
                    key={line.id}
                    line={line}
                    pending={state.pending}
                    onQuantity={state.changeQuantity}
                    onRemove={state.removeLine}
                    moveLabel="Save for later"
                    onMove={state.saveLine}
                  />
                ))}
              </ul>
            </section>
            <CartSummary quote={state.quote} pending={state.pending} />
          </div>
        )}
        {state.saved.length > 0 ? (
          <section className="flex flex-col gap-4">
            <h2 className="text-h2">Saved for later</h2>
            <ul className="divide-y divide-border">
              {state.saved.map((line) => (
                <CartLineRow
                  key={line.id}
                  line={line}
                  pending={state.pending}
                  onQuantity={state.changeQuantity}
                  onRemove={state.removeLine}
                  moveLabel="Move to cart"
                  onMove={state.restoreLine}
                />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </>
  );
}
