"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";
import { startTransition, useOptimistic, useState } from "react";
import { toast } from "sonner";
import { addToCart } from "@/actions/cart";
import { useCartCount } from "@/components/cart/cart-provider";
import { startBuyNow } from "@/actions/buy-now";
import { toggleWishlist } from "@/actions/wishlist";
import { focusRingClass } from "@/components/product/metrics";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import { config } from "@/lib/config";
import { stockLabel } from "@/lib/product-card";
import { cn } from "@/lib/utils";

export type PurchasePanelProps = {
  productId: string;
  priceInPence: number;
  listPriceInPence: number | null;
  stock: number;
  deliveryLabel: string;
  saved?: boolean;
};

function failureMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "Try again.";
}

function StableLabel({
  idle,
  pending,
  busy,
}: {
  idle: string;
  pending: string;
  busy: boolean;
}) {
  return (
    <span className="inline-grid">
      <span className={cn("col-start-1 row-start-1", busy && "invisible")} aria-hidden={busy}>
        {idle}
      </span>
      <span className={cn("col-start-1 row-start-1", !busy && "invisible")} aria-hidden={!busy}>
        {pending}
      </span>
    </span>
  );
}

function QuantityField({
  quantity,
  max,
  disabled,
  onChange,
  className,
}: {
  quantity: number;
  max: number;
  disabled: boolean;
  onChange: (quantity: number) => void;
  className?: string;
}) {
  if (max < 1) return null;

  return (
    <label className={cn("flex shrink-0 flex-col gap-1 text-small", className)}>
      Quantity
      <select
        value={quantity}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-11 w-full rounded-lg border border-border bg-background px-2 text-body",
          focusRingClass,
        )}
      >
        {Array.from({ length: max }, (_, option) => {
          const value = option + 1;
          return (
            <option key={value} value={value}>
              {value}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function BuyActions({
  stock,
  pending,
  onAdd,
  onBuy,
  className,
}: {
  stock: number;
  pending: "cart" | "buy" | null;
  onAdd: () => void;
  onBuy: () => void;
  className?: string;
}) {
  const unavailable = stock <= 0;

  return (
    <div className={cn("flex min-w-0 gap-2", className)}>
      <Button
        type="button"
        variant="default"
        className="h-11 min-w-0 flex-1 px-4"
        disabled={unavailable || pending !== null}
        aria-busy={pending === "cart"}
        onClick={onAdd}
      >
        <StableLabel idle="Add to cart" pending="Adding" busy={pending === "cart"} />
      </Button>
      <Button
        type="button"
        variant="secondary"
        className="h-11 min-w-0 flex-1 px-4"
        disabled={unavailable || pending !== null}
        aria-busy={pending === "buy"}
        onClick={onBuy}
      >
        <StableLabel idle="Buy now" pending="Buying" busy={pending === "buy"} />
      </Button>
    </div>
  );
}

export function PurchasePanel({
  productId,
  priceInPence,
  listPriceInPence,
  stock,
  deliveryLabel,
  saved = false,
}: PurchasePanelProps) {
  const router = useRouter();
  const [savedState, setSavedState] = useState(saved);
  const [quantity, setQuantity] = useState(1);
  const [optimisticSaved, setOptimisticSaved] = useOptimistic(savedState);
  const [optimisticQuantity, setOptimisticQuantity] = useOptimistic(
    quantity,
    (_current, next: number) => next,
  );
  const [cartPending, setCartPending] = useOptimistic(false);
  const [buyPending, setBuyPending] = useOptimistic(false);
  const [wishlistPending, setWishlistPending] = useOptimistic(false);
  const { count, previewCount, setCount } = useCartCount();
  const limit = Math.min(10, Math.max(0, Math.trunc(stock)));
  const selected = limit < 1 ? 1 : Math.min(Math.max(1, optimisticQuantity), limit);
  const purchasePending = cartPending ? "cart" : buyPending ? "buy" : null;
  const words = stockLabel(stock) ?? "In stock";
  const stockClass =
    stock <= 0 ? "text-(--color-out-of-stock)" : stock <= 3 ? "text-(--color-low-stock)" : "text-foreground";

  function changeQuantity(next: number) {
    startTransition(() => {
      setOptimisticQuantity(next);
      setQuantity(next);
    });
  }

  function add() {
    const previous = count;
    startTransition(async () => {
      setCartPending(true);
      previewCount(previous + selected);
      try {
        const result = await addToCart({ productId, quantity: selected });
        if (!result.ok) {
          setCount(previous);
          toast.error(result.error);
          return;
        }
        setCount(result.data.cartCount);
        toast.success("Added to cart");
      } catch (error) {
        setCount(previous);
        toast.error(failureMessage(error));
      }
    });
  }

  function buy() {
    startTransition(async () => {
      setBuyPending(true);
      try {
        const result = await startBuyNow({ productId, quantity: selected });
        if (!result.ok) {
          if (result.error === "Sign in to buy now.") {
            const next = `${window.location.pathname}${window.location.search}`;
            router.push(`/signin?next=${encodeURIComponent(next)}`);
            return;
          }
          toast.error(result.error);
          return;
        }
        router.push(result.data.href);
      } catch (error) {
        toast.error(failureMessage(error));
      }
    });
  }

  function wishlist() {
    startTransition(async () => {
      const next = !savedState;
      setWishlistPending(true);
      setOptimisticSaved(next);
      try {
        const result = await toggleWishlist({ productId });
        if (!result.ok) {
          toast.error(result.error);
          return;
        }
        setSavedState(result.data.saved);
        toast.success(result.data.saved ? "Saved" : "Removed from wishlist");
      } catch (error) {
        toast.error(failureMessage(error));
      }
    });
  }

  return (
    <>
      <aside className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
        <Price
          priceInPence={priceInPence}
          listPriceInPence={listPriceInPence}
          size="h3"
          savings
        />
        <p className={cn("text-small", stockClass)}>{words}</p>
        <p className="text-body">{deliveryLabel}</p>
        <QuantityField
          quantity={selected}
          max={limit}
          disabled={purchasePending !== null}
          onChange={changeQuantity}
          className="w-full max-w-24"
        />
        <BuyActions
          stock={stock}
          pending={purchasePending}
          onAdd={add}
          onBuy={buy}
          className="w-full"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 w-full px-4"
          aria-pressed={optimisticSaved}
          disabled={wishlistPending}
          onClick={wishlist}
        >
          <Heart
            className={cn("size-4", optimisticSaved && "fill-current")}
            aria-hidden="true"
          />
          <StableLabel
            idle={optimisticSaved ? "Saved" : "Add to wishlist"}
            pending="Saving"
            busy={wishlistPending}
          />
        </Button>
        <p className="text-small text-muted-foreground">
          You can return this within {config.returnWindowDays} days of delivery.
        </p>
      </aside>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background p-3 lg:hidden">
        <div className="flex items-end gap-2">
          <QuantityField
            quantity={selected}
            max={limit}
            disabled={purchasePending !== null}
            onChange={changeQuantity}
            className="w-16"
          />
          <BuyActions
            stock={stock}
            pending={purchasePending}
            onAdd={add}
            onBuy={buy}
            className="flex-1"
          />
        </div>
      </div>
    </>
  );
}
