import { config } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import {
  resolveProductSort,
  type ProductCardOptions,
  type ProductSort,
} from "@/lib/queries/catalogue-clauses";

export type CatalogueFilters = {
  brands: string[];
  minPrice: number | null;
  maxPrice: number | null;
  minRating: number | null;
  inStock: boolean;
  sort: ProductSort;
  page: number;
};

export type SearchRecord = Record<string, string | string[] | undefined>;

export type Culprit = {
  filterName: string;
  href: string;
};

export type EmptyCopy = {
  text: string;
  action: string;
  href: string;
};

const maxPage = 1000;
const maxBrands = 40;

export function defaultFilters(): CatalogueFilters {
  return {
    brands: [],
    minPrice: null,
    maxPrice: null,
    minRating: null,
    inStock: false,
    sort: "relevance",
    page: 1,
  };
}

function listed(value: string | string[] | undefined): string[] {
  if (value === undefined) return [];
  const entries = Array.isArray(value) ? value : [value];
  return entries.flatMap((entry) => entry.split(","));
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function integerParam(value: string | string[] | undefined): number | null {
  const raw = first(value);
  if (!raw || !/^\d+$/.test(raw)) return null;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed)) return null;
  return parsed;
}

export function parseCatalogueFilters(input: SearchRecord): CatalogueFilters {
  const brands = [...new Set(listed(input.brand).map((brand) => brand.trim()).filter(Boolean))]
    .sort((left, right) => left.localeCompare(right, "en-GB"))
    .slice(0, maxBrands);

  let minPrice = integerParam(input.min);
  let maxPrice = integerParam(input.max);
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) {
    const swapped = minPrice;
    minPrice = maxPrice;
    maxPrice = swapped;
  }

  const rating = integerParam(input.rating);
  const page = integerParam(input.page);
  const sort = first(input.sort);

  return {
    brands,
    minPrice,
    maxPrice,
    minRating: rating !== null && rating >= 1 && rating <= 4 ? rating : null,
    inStock: first(input.stock) === "in",
    sort: sort ? resolveProductSort(sort) : "relevance",
    page: page !== null && page >= 1 ? Math.min(page, maxPage) : 1,
  };
}

export function catalogueHref(
  pathname: string,
  current: CatalogueFilters,
  patch: Partial<CatalogueFilters> = {},
): string {
  const keys = Object.keys(patch) as (keyof CatalogueFilters)[];
  const changesResults = keys.some((key) => key !== "page");
  const page = patch.page ?? (changesResults ? 1 : current.page);
  const next: CatalogueFilters = { ...current, ...patch, page };
  const params = new URLSearchParams();

  for (const brand of [...next.brands].sort((left, right) => left.localeCompare(right, "en-GB"))) {
    params.append("brand", brand);
  }
  if (next.minPrice !== null) params.set("min", String(next.minPrice));
  if (next.maxPrice !== null) params.set("max", String(next.maxPrice));
  if (next.minRating !== null) params.set("rating", String(next.minRating));
  if (next.inStock) params.set("stock", "in");
  if (next.sort !== "relevance") params.set("sort", next.sort);
  if (next.page > 1) params.set("page", String(next.page));

  const query = params.toString();
  return query.length > 0 ? `${pathname}?${query}` : pathname;
}

export function toggleBrand(filters: CatalogueFilters, brand: string): string[] {
  return filters.brands.includes(brand)
    ? filters.brands.filter((entry) => entry !== brand)
    : [...filters.brands, brand];
}

export function toProductCardOptions(
  categorySlug: string,
  filters: CatalogueFilters,
): ProductCardOptions {
  return {
    categorySlug,
    brands: filters.brands,
    minPrice: filters.minPrice ?? undefined,
    maxPrice: filters.maxPrice ?? undefined,
    minRating: filters.minRating ?? undefined,
    inStockOnly: filters.inStock || undefined,
    sort: filters.sort,
    page: filters.page,
  };
}

function priceFilterName(minPrice: number | null, maxPrice: number | null): string {
  const band = config.priceBands.find(
    (entry) => entry.minPrice === minPrice && entry.maxPrice === maxPrice,
  );
  if (band) {
    return `${band.label.charAt(0).toLowerCase()}${band.label.slice(1)} filter`;
  }
  if (minPrice !== null && maxPrice !== null) {
    return `${formatPrice(minPrice)} to ${formatPrice(maxPrice)} filter`;
  }
  if (minPrice !== null) return `over ${formatPrice(minPrice)} filter`;
  if (maxPrice !== null) return `under ${formatPrice(maxPrice)} filter`;
  return "price filter";
}

export function likelyCulprit(pathname: string, filters: CatalogueFilters): Culprit | null {
  if (filters.minPrice !== null || filters.maxPrice !== null) {
    return {
      filterName: priceFilterName(filters.minPrice, filters.maxPrice),
      href: catalogueHref(pathname, filters, { minPrice: null, maxPrice: null, page: 1 }),
    };
  }
  if (filters.brands.length > 0) {
    const filterName = filters.brands.length === 1 ? `${filters.brands[0]} filter` : "brand filter";
    return {
      filterName,
      href: catalogueHref(pathname, filters, { brands: [], page: 1 }),
    };
  }
  if (filters.minRating !== null) {
    return {
      filterName: `${filters.minRating}-star filter`,
      href: catalogueHref(pathname, filters, { minRating: null, page: 1 }),
    };
  }
  if (filters.inStock) {
    return {
      filterName: "in stock filter",
      href: catalogueHref(pathname, filters, { inStock: false, page: 1 }),
    };
  }
  return null;
}

export function emptyCatalogueCopy(subject: string, culprit: Culprit | null): EmptyCopy {
  if (!culprit) {
    return {
      text: `Nothing in ${subject} yet.`,
      action: "Back to the shop",
      href: "/",
    };
  }
  return {
    text: `No results in ${subject}. Try removing the ${culprit.filterName}.`,
    action: `Remove the ${culprit.filterName}`,
    href: culprit.href,
  };
}

export function productCountLabel(count: number): string {
  const grouped = new Intl.NumberFormat("en-GB").format(count);
  return count === 1 ? "1 product" : `${grouped} products`;
}

export const sortChoices: { sort: ProductSort; label: string }[] = [
  { sort: "relevance", label: "Featured" },
  { sort: "price-asc", label: "Price: low to high" },
  { sort: "price-desc", label: "Price: high to low" },
  { sort: "rating", label: "Customer rating" },
  { sort: "reviews", label: "Most reviews" },
  { sort: "newest", label: "Newest" },
];
