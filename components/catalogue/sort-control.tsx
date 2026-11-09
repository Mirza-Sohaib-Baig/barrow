import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import { catalogueHref, sortChoices, type CatalogueFilters } from "@/lib/catalogue";
import { withSearchQuery } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export function SortControl({
  pathname,
  filters,
  query,
}: {
  pathname: string;
  filters: CatalogueFilters;
  query?: string;
}) {
  return (
    <nav aria-label="Sort" className="flex flex-wrap gap-2">
      {sortChoices.map((choice) => {
        const active = filters.sort === choice.sort;
        return (
          <Link
            key={choice.sort}
            href={withSearchQuery(catalogueHref(pathname, filters, { sort: choice.sort, page: 1 }), query)}
            aria-current={active ? "true" : undefined}
            className={cn(
              "inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-small",
              focusRingClass,
              active ? "bg-secondary font-medium" : "bg-card hover:bg-muted",
            )}
          >
            {choice.label}
          </Link>
        );
      })}
    </nav>
  );
}
