"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { CartLineRow } from "@/components/cart/cart-line";
import { FreeShippingBar } from "@/components/cart/free-shipping";
import { loadCartView } from "@/components/cart/load-cart";
import { useCartState, type CartSnapshot } from "@/components/cart/use-cart-state";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { formatPrice } from "@/lib/format";
import { quoteCart } from "@/lib/pricing";
import { cn } from "@/lib/utils";

const emptySnapshot: CartSnapshot = {
  lines: [],
  saved: [],
  quote: quoteCart([], "standard"),
};

function DrawerSkeleton() {
  return (
    <div className="flex flex-col gap-4 px-4" aria-hidden="true">
      <div className="flex gap-4">
        <Skeleton className="size-24 rounded-lg" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
      <div className="flex gap-4">
        <Skeleton className="size-24 rounded-lg" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-5 w-2/3" />
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-10 w-24" />
        </div>
      </div>
    </div>
  );
}

export function CartDrawer({ open }: { open: boolean }) {
  const state = useCartState(emptySnapshot, false);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [seen, setSeen] = useState(false);
  const epoch = useRef(0);
  const replace = state.replace;

  useEffect(() => {
    if (!open) return;
    const token = epoch.current;
    let cancel = false;
    loadCartView()
      .then((fresh) => {
        if (cancel || token !== epoch.current) return;
        replace({ lines: fresh.cart.lines, saved: fresh.saved, quote: fresh.cart.quote });
        setSeen(true);
        setStatus("ready");
      })
      .catch(() => {
        if (cancel || token !== epoch.current) return;
        setStatus("error");
      });
    return () => {
      cancel = true;
    };
  }, [open, replace]);

  function bump() {
    epoch.current += 1;
  }

  const itemCount = state.lines.reduce((sum, line) => sum + line.quantity, 0);
  const showSkeleton = status !== "ready" && status !== "error" && !seen;

  return (
    <SheetContent
      side="right"
      className="data-[side=right]:w-full! data-[side=right]:max-w-none! sm:data-[side=right]:max-w-md!"
    >
      <SheetHeader className="pr-10">
        <SheetTitle>Your cart</SheetTitle>
        <SheetDescription className="sr-only">
          {itemCount === 1 ? "1 item in your cart" : `${itemCount} items in your cart`}
        </SheetDescription>
      </SheetHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {status === "error" ? (
          <div className="flex flex-col gap-4" role="alert">
            <p className="text-body">We could not load your cart.</p>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-fit"
              onClick={() => {
                setStatus("loading");
                const token = epoch.current;
                loadCartView()
                  .then((fresh) => {
                    if (token !== epoch.current) return;
                    replace({
                      lines: fresh.cart.lines,
                      saved: fresh.saved,
                      quote: fresh.cart.quote,
                    });
                    setSeen(true);
                    setStatus("ready");
                  })
                  .catch(() => {
                    if (token !== epoch.current) return;
                    setStatus("error");
                  });
              }}
            >
              Try again
            </Button>
          </div>
        ) : showSkeleton ? (
          <div aria-busy="true">
            <span className="sr-only">Loading your cart</span>
            <DrawerSkeleton />
          </div>
        ) : state.lines.length === 0 ? (
          <div className="flex flex-col gap-3">
            <p className="text-h3">Your cart is empty.</p>
            <p className="text-muted-foreground">
              Choose a department and add something when you are ready.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {state.lines.map((line) => (
              <CartLineRow
                key={line.id}
                line={line}
                pending={state.pending}
                onQuantity={(lineId, quantity) => {
                  bump();
                  state.changeQuantity(lineId, quantity);
                }}
                onRemove={(lineId) => {
                  bump();
                  state.removeLine(lineId);
                }}
              />
            ))}
          </ul>
        )}
      </div>
      <SheetFooter>
        {status === "ready" ? (
          <>
            <FreeShippingBar amountToFreeShipping={state.quote.amountToFreeShipping} />
            {state.lines.length > 0 ? (
              <div className="flex items-baseline justify-between gap-4 text-body">
                <span>Subtotal</span>
                <span className="tnum">{formatPrice(state.quote.subtotal)}</span>
              </div>
            ) : null}
          </>
        ) : null}
        <Link href="/cart" className={cn(buttonVariants({ className: "h-10 w-full" }))}>
          View cart
        </Link>
      </SheetFooter>
    </SheetContent>
  );
}
