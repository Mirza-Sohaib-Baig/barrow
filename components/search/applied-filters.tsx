import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import { searchHref } from "@/lib/search-params";
import type { CatalogueFilters } from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";

function Chip({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex min-h-8 items-center rounded-full border border-border px-3 text-small",
        focusRingClass,
      )}
    >
      {label}
      <span className="sr-only">, remove filter</span>
    </Link>
  );
}

export function AppliedFilters({
  query,
  filters,
}: {
  query: string;
  filters: CatalogueFilters;
}) {
  const chips: { key: string; label: string; href: string }[] = [];
  for (const brand of filters.brands) {
    chips.push({
      key: `brand-${brand}`,
      label: brand,
      href: searchHref(query, filters, {
        brands: filters.brands.filter((entry) => entry !== brand),
        page: 1,
      }),
    });
  }
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    const label =
      filters.minPrice !== null && filters.maxPrice !== null
        ? `${formatPrice(filters.minPrice)} to ${formatPrice(filters.maxPrice)}`
        : filters.minPrice !== null
          ? `Over ${formatPrice(filters.minPrice)}`
          : `Under ${formatPrice(filters.maxPrice ?? 0)}`;
    chips.push({
      key: "price",
      label,
      href: searchHref(query, filters, { minPrice: null, maxPrice: null, page: 1 }),
    });
  }
  if (filters.minRating !== null) {
    chips.push({
      key: "rating",
      label: `${filters.minRating} stars and up`,
      href: searchHref(query, filters, { minRating: null, page: 1 }),
    });
  }
  if (filters.inStock) {
    chips.push({
      key: "stock",
      label: "In stock",
      href: searchHref(query, filters, { inStock: false, page: 1 }),
    });
  }
  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Applied filters">
      {chips.map((chip) => (
        <Chip key={chip.key} href={chip.href} label={chip.label} />
      ))}
      <Link
        href={searchHref(query, filters, {
          brands: [],
          minPrice: null,
          maxPrice: null,
          minRating: null,
          inStock: false,
          page: 1,
        })}
        className={cn("inline-flex min-h-8 items-center px-2 text-small underline-offset-2 hover:underline", focusRingClass)}
      >
        Clear all
      </Link>
    </div>
  );
}
