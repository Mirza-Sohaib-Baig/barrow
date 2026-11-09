import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import { catalogueHref, type CatalogueFilters } from "@/lib/catalogue";
import { withSearchQuery } from "@/lib/search-params";
import { cn } from "@/lib/utils";

function pageLinkClass(disabled: boolean) {
  return cn(
    "inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-small",
    focusRingClass,
    disabled ? "pointer-events-none text-muted-foreground" : "bg-card hover:bg-muted",
  );
}

export function Pagination({
  pathname,
  filters,
  page,
  pageCount,
  query,
}: {
  pathname: string;
  filters: CatalogueFilters;
  page: number;
  pageCount: number;
  query?: string;
}) {
  if (pageCount <= 1) return null;

  const previous = page > 1 ? withSearchQuery(catalogueHref(pathname, filters, { page: page - 1 }), query) : null;
  const next = page < pageCount ? withSearchQuery(catalogueHref(pathname, filters, { page: page + 1 }), query) : null;

  return (
    <nav aria-label="Pagination" className="flex items-center justify-between gap-4">
      {previous ? (
        <Link href={previous} className={pageLinkClass(false)}>
          Previous
        </Link>
      ) : (
        <span aria-disabled="true" className={pageLinkClass(true)}>
          Previous
        </span>
      )}
      <p className="tnum text-small text-muted-foreground">
        Page {page} of {pageCount}
      </p>
      {next ? (
        <Link href={next} className={pageLinkClass(false)}>
          Next
        </Link>
      ) : (
        <span aria-disabled="true" className={pageLinkClass(true)}>
          Next
        </span>
      )}
    </nav>
  );
}
