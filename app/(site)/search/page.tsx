import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CategoryBrowseSkeleton } from "@/components/catalogue/browse-skeleton";
import { CatalogueResults } from "@/components/catalogue/catalogue-results";
import type { FilterModel } from "@/components/catalogue/filter-groups";
import { focusRingClass } from "@/components/product/metrics";
import { AppliedFilters } from "@/components/search/applied-filters";
import { SearchNoResults } from "@/components/search/no-results";
import {
  emptyCatalogueCopy,
  parseCatalogueFilters,
  type SearchRecord,
} from "@/lib/catalogue";
import { config } from "@/lib/config";
import { getAlternativeQueries } from "@/lib/queries/search";
import { normalizeSearchQuery } from "@/lib/queries/catalogue-clauses";
import { getCategoryRail, getFacets, getHomeCategories, getProductCards } from "@/lib/queries/products";
import { searchHref } from "@/lib/search-params";
import { cn } from "@/lib/utils";

type PageProps = {
  searchParams: Promise<SearchRecord>;
};

function resultLabel(page: number, total: number, query: string): string {
  const grouped = new Intl.NumberFormat("en-GB").format(total);
  if (total === 1) return `1 result for ${query}`;
  const start = (page - 1) * config.pageSize + 1;
  const end = Math.min(page * config.pageSize, total);
  return `${start} to ${end} of ${grouped} results for ${query}`;
}

async function fallbackRails() {
  const categories = await getHomeCategories();
  const picked = categories.slice(0, 2);
  const rails = await Promise.all(
    picked.map(async (category) => ({
      title: category.name,
      href: `/c/${category.slug}`,
      products: await getCategoryRail({ slug: category.slug, limit: config.homeCards.perRail }),
    })),
  );
  return rails.filter((rail) => rail.products.length > 0);
}

async function SearchResults({ searchParams }: PageProps) {
  const raw = await searchParams;
  const filters = parseCatalogueFilters(raw);
  const query = normalizeSearchQuery(typeof raw.q === "string" ? raw.q : Array.isArray(raw.q) ? raw.q[0] : undefined);

  if (!query) {
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-h1">Search the shop</h1>
        <p className="text-body text-muted-foreground">Type a product, brand, or department in the search field.</p>
        <Link href="/" className={cn("w-fit text-body underline-offset-2 hover:underline", focusRingClass)}>
          Back to the shop
        </Link>
      </div>
    );
  }

  const options = {
    query,
    brands: filters.brands,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minRating: filters.minRating ?? undefined,
    inStockOnly: filters.inStock || undefined,
    sort: filters.sort,
    page: filters.page,
  };
  const [listing, facets] = await Promise.all([getProductCards(options), getFacets(options)]);
  if (listing.total > 0 && listing.totalPages > 0 && filters.page > listing.totalPages) {
    redirect(searchHref(query, filters, { page: listing.totalPages }));
  }

  if (listing.total === 0) {
    const [alternatives, rails] = await Promise.all([getAlternativeQueries(query), fallbackRails()]);
    return <SearchNoResults query={query} alternatives={alternatives} rails={rails} />;
  }

  const model: FilterModel = {
    pathname: "/search",
    filters,
    query,
    brands: facets.brands,
    ratings: facets.ratings,
    departments: [],
    parent: null,
  };

  return (
    <div className="flex flex-col gap-4">
      <AppliedFilters query={query} filters={filters} />
      <CatalogueResults
        heading={{ title: "Search", countLabel: resultLabel(listing.page, listing.total, query) }}
        model={model}
        products={listing.items}
        empty={emptyCatalogueCopy(query, null)}
        page={listing.page}
        pageCount={listing.totalPages}
      />
    </div>
  );
}

export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const raw = await searchParams;
  const query = normalizeSearchQuery(typeof raw.q === "string" ? raw.q : Array.isArray(raw.q) ? raw.q[0] : undefined);
  const title = query ? `${query} · ${config.siteName}` : `Search · ${config.siteName}`;
  return { title, description: query ? `Results for ${query}` : "Search the shop" };
}

export default function SearchPage(props: PageProps) {
  return (
    <Suspense fallback={<CategoryBrowseSkeleton />}>
      <SearchResults {...props} />
    </Suspense>
  );
}
