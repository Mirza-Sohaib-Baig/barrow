"use client";

import { useCallback, useOptimistic, useState, useTransition } from "react";
import { toast } from "sonner";
import { moveToCart, moveToSaved, removeFromCart, updateQuantity } from "@/actions/cart";
import { useCartCount } from "@/components/cart/cart-provider";
import { loadCartView } from "@/components/cart/load-cart";
import { quoteCart, type PriceQuote } from "@/lib/pricing";
import type { CartLine } from "@/lib/queries/cart";

export type CartSnapshot = {
  lines: CartLine[];
  saved: CartLine[];
  quote: PriceQuote;
};

type MutationResult =
  | { ok: true; data: { cartCount: number; quote: PriceQuote } }
  | { ok: false; error: string };

function sumQuantity(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.quantity, 0);
}

function quoteLines(lines: CartLine[]): PriceQuote {
  return quoteCart(
    lines.map((line) => ({
      unitPriceInPence: line.unitPriceInPence,
      quantity: line.quantity,
    })),
    "standard",
  );
}

function fingerprint(lines: CartLine[]): string {
  return lines
    .map((line) => `${line.id}:${line.quantity}:${line.stock}:${line.unitPriceInPence}`)
    .join("|");
}

function quoteFingerprint(quote: PriceQuote): string {
  return [
    quote.subtotal,
    quote.shipping,
    quote.tax,
    quote.total,
    quote.amountToFreeShipping,
  ].join(":");
}

function withoutLine(lines: CartLine[], lineId: string): CartLine[] {
  return lines.filter((line) => line.id !== lineId);
}

function withQuantity(lines: CartLine[], lineId: string, quantity: number): CartLine[] {
  if (quantity <= 0) return withoutLine(lines, lineId);
  return lines.map((line) => (line.id === lineId ? { ...line, quantity } : line));
}

export function useCartState(initial: CartSnapshot, syncFromProps: boolean) {
  const { count, setCount } = useCartCount();
  const [snapshot, setSnapshot] = useState(initial);
  const [optimistic, applyOptimistic] = useOptimistic(
    snapshot,
    (_current: CartSnapshot, next: CartSnapshot) => next,
  );
  const [pending, startTransition] = useTransition();
  const linesKey = fingerprint(initial.lines);
  const savedKey = fingerprint(initial.saved);
  const quoteKey = quoteFingerprint(initial.quote);
  const propKey = `${linesKey}|${savedKey}|${quoteKey}`;
  const [seenKey, setSeenKey] = useState(propKey);
  if (syncFromProps && seenKey !== propKey) {
    setSeenKey(propKey);
    setSnapshot(initial);
  }

  function run(
    next: CartSnapshot,
    nextCount: number,
    success: string,
    execute: () => Promise<MutationResult>,
  ) {
    const previousCount = count;
    setCount(nextCount);
    startTransition(async () => {
      applyOptimistic(next);
      let result: MutationResult;
      try {
        result = await execute();
      } catch {
        setCount(previousCount);
        toast.error("We could not update your cart. Try again.");
        return;
      }
      if (!result.ok) {
        setCount(previousCount);
        toast.error(result.error);
        return;
      }
      toast.success(success);
      try {
        const fresh = await loadCartView();
        setSnapshot({
          lines: fresh.cart.lines,
          saved: fresh.saved,
          quote: result.data.quote,
        });
        setCount(result.data.cartCount);
      } catch {
        setSnapshot({ ...next, quote: result.data.quote });
        setCount(result.data.cartCount);
      }
    });
  }

  function changeQuantity(lineId: string, quantity: number) {
    if (pending) return;
    const active = snapshot.lines.find((line) => line.id === lineId);
    const savedLine = snapshot.saved.find((line) => line.id === lineId);
    const line = active ?? savedLine;
    if (!line || line.quantity === quantity) return;

    if (quantity > 0 && line.stock <= 0) {
      run(snapshot, count, "Quantity updated.", () => updateQuantity({ lineId, quantity }));
      return;
    }

    const capped = quantity <= 0 ? 0 : Math.min(quantity, line.stock, 99);
    const lines = active ? withQuantity(snapshot.lines, lineId, capped) : snapshot.lines;
    const saved = savedLine ? withQuantity(snapshot.saved, lineId, capped) : snapshot.saved;
    run(
      { lines, saved, quote: quoteLines(lines) },
      sumQuantity(lines),
      capped === 0 ? "Removed from your cart." : "Quantity updated.",
      () => updateQuantity({ lineId, quantity }),
    );
  }

  function removeLine(lineId: string) {
    if (pending) return;
    const lines = withoutLine(snapshot.lines, lineId);
    const saved = withoutLine(snapshot.saved, lineId);
    if (lines.length === snapshot.lines.length && saved.length === snapshot.saved.length) return;
    run(
      { lines, saved, quote: quoteLines(lines) },
      sumQuantity(lines),
      "Removed from your cart.",
      () => removeFromCart({ lineId }),
    );
  }

  function saveLine(lineId: string) {
    if (pending) return;
    const line = snapshot.lines.find((item) => item.id === lineId);
    if (!line) return;
    if (line.stock <= 0) {
      run(snapshot, count, "Saved for later.", () => moveToSaved({ lineId }));
      return;
    }
    const lines = withoutLine(snapshot.lines, lineId);
    const existing = snapshot.saved.find((item) => item.productId === line.productId);
    const saved = existing
      ? snapshot.saved.map((item) =>
          item.productId === line.productId
            ? { ...item, quantity: Math.min(item.quantity + line.quantity, line.stock, 99) }
            : item,
        )
      : [
          { ...line, savedForLater: true, quantity: Math.min(line.quantity, line.stock, 99) },
          ...snapshot.saved,
        ];
    run(
      { lines, saved, quote: quoteLines(lines) },
      sumQuantity(lines),
      "Saved for later.",
      () => moveToSaved({ lineId }),
    );
  }

  function restoreLine(lineId: string) {
    if (pending) return;
    const line = snapshot.saved.find((item) => item.id === lineId);
    if (!line) return;
    if (line.stock <= 0) {
      run(snapshot, count, "Moved to your cart.", () => moveToCart({ lineId }));
      return;
    }
    const saved = withoutLine(snapshot.saved, lineId);
    const existing = snapshot.lines.find((item) => item.productId === line.productId);
    const quantity = Math.min((existing ? existing.quantity : 0) + line.quantity, line.stock, 99);
    const lines = existing
      ? snapshot.lines.map((item) => (item.id === existing.id ? { ...item, quantity } : item))
      : [...snapshot.lines, { ...line, savedForLater: false, quantity }];
    run(
      { lines, saved, quote: quoteLines(lines) },
      sumQuantity(lines),
      "Moved to your cart.",
      () => moveToCart({ lineId }),
    );
  }

  const replace = useCallback(
    (next: CartSnapshot) => {
      setSnapshot(next);
      setCount(sumQuantity(next.lines));
    },
    [setCount],
  );

  return {
    lines: optimistic.lines,
    saved: optimistic.saved,
    quote: optimistic.quote,
    pending,
    changeQuantity,
    removeLine,
    saveLine,
    restoreLine,
    replace,
  };
}
