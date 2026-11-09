import { resolveReviewSort, type ReviewSort } from "@/lib/queries/catalogue-clauses";

export const productTabs = ["overview", "specs", "reviews"] as const;

export type ProductTab = (typeof productTabs)[number];

const starRatings = [1, 2, 3, 4, 5] as const;

export type StarRatingFilter = (typeof starRatings)[number];

export type ProductQuery = {
  tab: ProductTab;
  rating?: StarRatingFilter;
  sort: ReviewSort;
  page: number;
};

export type ProductSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

function parseTab(value: string | undefined): ProductTab {
  if (value === "overview" || value === "specs" || value === "reviews") return value;
  return "overview";
}

function parseRating(value: string | undefined): StarRatingFilter | undefined {
  if (value == null || value.trim() === "") return undefined;
  const parsed = Number(value);
  for (const rating of starRatings) {
    if (rating === parsed) return rating;
  }
  return undefined;
}

function parsePage(value: string | undefined): number {
  if (value == null || value.trim() === "") return 1;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return Math.floor(parsed);
}

export function parseProductQuery(params: ProductSearchParams): ProductQuery {
  const sortValue = first(params.sort);
  return {
    tab: parseTab(first(params.tab)),
    rating: parseRating(first(params.rating)),
    sort:
      sortValue == null || sortValue.trim() === "" ? "helpful" : resolveReviewSort(sortValue),
    page: parsePage(first(params.page)),
  };
}

export function productHref(
  slug: string,
  query: ProductQuery,
  patch: {
    tab?: ProductTab;
    rating?: StarRatingFilter | null;
    sort?: ReviewSort;
    page?: number;
  } = {},
): string {
  const tab = patch.tab ?? query.tab;
  const sort = patch.sort ?? query.sort;
  const page = patch.page ?? query.page;
  const rating = patch.rating === null ? undefined : (patch.rating ?? query.rating);
  const params = new URLSearchParams();

  if (tab !== "overview") params.set("tab", tab);
  if (tab === "reviews") {
    if (rating) params.set("rating", String(rating));
    if (sort !== "helpful") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
  }

  const search = params.toString();
  const path = `/p/${encodeURIComponent(slug)}`;
  return search ? `${path}?${search}` : path;
}
