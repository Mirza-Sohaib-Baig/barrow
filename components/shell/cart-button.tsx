"use client";

import { useState } from "react";
import { ShoppingBagIcon } from "lucide-react";
import { CartDrawer } from "@/components/cart/cart-drawer";
import { CartToaster, useCartCount } from "@/components/cart/cart-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";

export function CartButton() {
  const { count } = useCartCount();
  const [open, setOpen] = useState(false);
  const label = `Cart, ${count} ${count === 1 ? "item" : "items"}`;

  return (
    <>
      <CartToaster />
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="relative size-10" aria-label={label} />
          }
        >
          <ShoppingBagIcon />
          <span
            data-testid="cart-count"
            aria-hidden="true"
            className="tnum absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-foreground px-1 text-small leading-none text-background"
          >
            {count}
          </span>
        </SheetTrigger>
        <CartDrawer open={open} />
      </Sheet>
    </>
  );
}
