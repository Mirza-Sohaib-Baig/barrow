import { catalogueHref, type CatalogueFilters } from "@/lib/catalogue";
import { normalizeSearchQuery } from "@/lib/queries/catalogue-clauses";

export function withSearchQuery(href: string, query: string | undefined): string {
  const term = normalizeSearchQuery(query);
  if (!term) return href;
  const split = href.indexOf("?");
  const path = split === -1 ? href : href.slice(0, split);
  const params = new URLSearchParams(split === -1 ? "" : href.slice(split + 1));
  params.set("q", term);
  const next = params.toString();
  return next.length > 0 ? `${path}?${next}` : path;
}

export function searchHref(
  query: string | undefined,
  filters: CatalogueFilters,
  patch: Partial<CatalogueFilters> = {},
): string {
  return withSearchQuery(catalogueHref("/search", filters, patch), query);
}
