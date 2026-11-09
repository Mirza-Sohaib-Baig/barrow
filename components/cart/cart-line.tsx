"use client";

import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { focusRingClass } from "@/components/product/metrics";
import { Price } from "@/components/product/price";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { stockLabel } from "@/lib/product-card";
import type { CartLine } from "@/lib/queries/cart";
import { cn } from "@/lib/utils";

function quantityChoices(line: CartLine): number[] {
  if (line.stock <= 0) return [];
  const upper = Math.min(99, Math.max(line.quantity, line.stock));
  return Array.from({ length: upper }, (_, index) => index + 1);
}

export function CartLineRow({
  line,
  pending,
  onQuantity,
  onRemove,
  moveLabel,
  onMove,
}: {
  line: CartLine;
  pending: boolean;
  onQuantity: (lineId: string, quantity: number) => void;
  onRemove: (lineId: string) => void;
  moveLabel?: string;
  onMove?: (lineId: string) => void;
}) {
  const choices = quantityChoices(line);
  const fieldId = `qty-${line.id}`;
  const stock = stockLabel(line.stock);

  return (
    <li className="flex gap-4 py-4 first:pt-0">
      <div className="relative size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
        {line.image ? (
          <Image src={line.image} alt={line.title} fill sizes="96px" className="object-cover" />
        ) : (
          <span className="absolute inset-0 flex items-center justify-center">
            <ImageOff className="size-6 text-muted-foreground" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <Link href={`/p/${line.slug}`} className={cn("line-clamp-2 text-h3", focusRingClass)}>
          {line.title}
        </Link>
        <Price
          priceInPence={line.unitPriceInPence}
          listPriceInPence={line.listPriceInPence}
          size="body"
          savings={line.listPriceInPence != null}
        />
        {stock ? (
          <p
            className={cn(
              "text-small",
              line.stock <= 0 ? "text-(--color-out-of-stock)" : "text-(--color-low-stock)",
            )}
          >
            {stock}
          </p>
        ) : null}
        <div className="flex flex-wrap items-end gap-2">
          {choices.length > 0 ? (
            <div className="flex flex-col gap-1">
              <label htmlFor={fieldId} className="text-small text-muted-foreground">
                Quantity
              </label>
              <Select
                value={String(line.quantity)}
                disabled={pending}
                onValueChange={(value) => {
                  if (value == null) return;
                  const next = Number(value);
                  if (!Number.isInteger(next)) return;
                  onQuantity(line.id, next);
                }}
              >
                <SelectTrigger
                  id={fieldId}
                  className="h-10 w-16"
                  aria-label={`Quantity for ${line.title}`}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {choices.map((amount) => (
                    <SelectItem key={amount} value={String(amount)}>
                      {amount}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <p className="tnum text-body">{line.quantity}</p>
          )}
          <Button
            type="button"
            variant="ghost"
            className="h-10"
            disabled={pending}
            aria-busy={pending}
            aria-label={`Remove ${line.title} from cart`}
            onClick={() => onRemove(line.id)}
          >
            Remove
          </Button>
          {moveLabel && onMove ? (
            <Button
              type="button"
              variant="secondary"
              className="h-10"
              disabled={pending}
              aria-busy={pending}
              aria-label={`${moveLabel}, ${line.title}`}
              onClick={() => onMove(line.id)}
            >
              {moveLabel}
            </Button>
          ) : null}
        </div>
      </div>
    </li>
  );
}
