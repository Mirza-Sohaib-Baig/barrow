import {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { categories, products, reviews } from "@/drizzle/schema";
import { config } from "@/lib/config";

const productSorts = [
  "relevance",
  "price-asc",
  "price-desc",
  "rating",
  "reviews",
  "newest",
] as const;

export type ProductSort = (typeof productSorts)[number];

export type FacetExclusion = "category" | "brand" | "price" | "rating";

export type ProductListOptions = {
  categorySlug?: string;
  query?: string;
  brands?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  inStockOnly?: boolean;
  dealsOnly?: boolean;
};

export type ProductCardOptions = ProductListOptions & {
  sort: ProductSort;
  page: number;
};

const reviewSorts = ["newest", "highest", "lowest", "helpful"] as const;

export type ReviewSort = (typeof reviewSorts)[number];

export type ReviewListOptions = {
  sort: ReviewSort;
  page: number;
  rating?: number;
};

const maxBrandFilters = 40;

export function resolveProductSort(sort: string): ProductSort {
  for (const candidate of productSorts) {
    if (candidate === sort) return candidate;
  }
  return "relevance";
}

export function resolveReviewSort(sort: string): ReviewSort {
  for (const candidate of reviewSorts) {
    if (candidate === sort) return candidate;
  }
  return "newest";
}

export function pageWindow(page: number, pageSize: number): {
  page: number;
  limit: number;
  offset: number;
} {
  const whole = Number.isFinite(page) ? Math.floor(page) : 1;
  const safePage = whole > 0 ? whole : 1;
  const limit = pageSize > 0 ? pageSize : 1;
  return { page: safePage, limit, offset: (safePage - 1) * limit };
}

export function pageCount(total: number, pageSize: number): number {
  if (!Number.isFinite(total) || total <= 0 || pageSize <= 0) return 0;
  return Math.ceil(total / pageSize);
}

export function normalizeSearchQuery(query: string | undefined): string | undefined {
  if (!query) return undefined;
  const trimmed = query.trim().replace(/\s+/g, " ").slice(0, config.searchQueryMaxLength);
  return trimmed.length > 0 ? trimmed : undefined;
}

function isPence(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isMinRating(value: number | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 && value <= 5;
}

function isExactRating(value: number | undefined): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5;
}

function normalizeBrands(brands: string[] | undefined): string[] {
  if (!brands) return [];
  const seen = new Set<string>();
  for (const brand of brands) {
    const trimmed = brand.trim();
    if (trimmed) seen.add(trimmed);
  }
  return [...seen].slice(0, maxBrandFilters);
}

// A department page includes products filed directly under it and under its children.
export function categoryClause(slug: string): SQL {
  return sql`${products.categoryId} in (
    with recursive tree as (
      select ${categories.id} as id
      from ${categories}
      where ${categories.slug} = ${slug}
      union all
      select ${categories.id}
      from ${categories}
      inner join tree on ${categories.parentId} = tree.id
    )
    select tree.id from tree
  )`;
}

export function dealClause(): SQL {
  return sql`${products.listPriceInPence} is not null and ${products.listPriceInPence} > ${products.priceInPence}`;
}

export function cardRanking(): SQL[] {
  return [desc(products.ratingAverage), desc(products.reviewCount), asc(products.id)];
}

export function dealRanking(): SQL[] {
  return [
    desc(sql`${products.listPriceInPence} - ${products.priceInPence}`),
    desc(products.ratingAverage),
    asc(products.id),
  ];
}

export function buildProductWhere(
  options: ProductListOptions,
  exclude?: FacetExclusion,
): SQL | undefined {
  const clauses: SQL[] = [];
  const query = normalizeSearchQuery(options.query);
  const categorySlug = options.categorySlug?.trim();
  const brands = normalizeBrands(options.brands);

  if (exclude !== "category" && categorySlug) {
    clauses.push(categoryClause(categorySlug));
  }
  if (query) {
    clauses.push(sql`${products.searchVector} @@ plainto_tsquery('english', ${query})`);
  }
  if (exclude !== "brand" && brands.length > 0) {
    clauses.push(inArray(products.brand, brands));
  }
  if (exclude !== "price" && isPence(options.minPrice)) {
    clauses.push(gte(products.priceInPence, options.minPrice));
  }
  if (exclude !== "price" && isPence(options.maxPrice)) {
    clauses.push(lte(products.priceInPence, options.maxPrice));
  }
  if (exclude !== "rating" && isMinRating(options.minRating)) {
    clauses.push(gte(products.ratingAverage, options.minRating));
  }
  if (options.inStockOnly) {
    clauses.push(gt(products.stock, 0));
  }
  if (options.dealsOnly) {
    clauses.push(dealClause());
  }

  if (clauses.length === 0) return undefined;
  const combined = and(...clauses);
  if (!combined) {
    throw new Error("Product filter was empty.");
  }
  return combined;
}

export function buildProductOrderBy(sort: string, query?: string): SQL[] {
  const resolved = resolveProductSort(sort);
  const tie = asc(products.id);
  const term = normalizeSearchQuery(query);

  switch (resolved) {
    case "price-asc":
      return [asc(products.priceInPence), tie];
    case "price-desc":
      return [desc(products.priceInPence), tie];
    case "rating":
      return [desc(products.ratingAverage), desc(products.reviewCount), tie];
    case "reviews":
      return [desc(products.reviewCount), desc(products.ratingAverage), tie];
    case "newest":
      return [desc(products.createdAt), tie];
    case "relevance":
      if (term) {
        return [
          desc(sql`ts_rank(${products.searchVector}, plainto_tsquery('english', ${term}))`),
          desc(products.reviewCount),
          tie,
        ];
      }
      return [desc(products.ratingAverage), desc(products.reviewCount), tie];
    default: {
      const unexpected: never = resolved;
      throw new Error(`Unexpected sort ${String(unexpected)}`);
    }
  }
}

function whereOrTrue(options: ProductListOptions, exclude: FacetExclusion): SQL {
  return buildProductWhere(options, exclude) ?? sql`true`;
}

export function buildFacetStatement(options: ProductListOptions): SQL {
  const categoryWhere = whereOrTrue(options, "category");
  const brandWhere = whereOrTrue(options, "brand");
  const priceWhere = whereOrTrue(options, "price");
  const ratingWhere = whereOrTrue(options, "rating");

  return sql`
    select 'category'::text as kind,
           ${categories.slug} as key,
           ${categories.name} as label,
           cast(count(*) as int) as count,
           cast(null as int) as min_price,
           cast(null as int) as max_price
    from ${products}
    inner join ${categories} on ${categories.id} = ${products.categoryId}
    where ${categoryWhere}
    group by ${categories.slug}, ${categories.name}

    union all

    select 'brand'::text,
           ${products.brand},
           ${products.brand},
           cast(count(*) as int),
           cast(null as int),
           cast(null as int)
    from ${products}
    where ${brandWhere}
    group by ${products.brand}

    union all

    select 'price'::text,
           cast(null as text),
           cast(null as text),
           cast(count(*) as int),
           cast(min(${products.priceInPence}) as int),
           cast(max(${products.priceInPence}) as int)
    from ${products}
    where ${priceWhere}

    union all

    select 'rating'::text,
           cast(rating_bucket.min_rating as text),
           cast(null as text),
           cast(count(*) filter (
             where ${products.ratingAverage} >= rating_bucket.min_rating
           ) as int),
           cast(null as int),
           cast(null as int)
    from ${products}
    cross join (values (4), (3), (2), (1)) as rating_bucket(min_rating)
    where ${ratingWhere}
    group by rating_bucket.min_rating
  `;
}

// similarity() compares the whole title, so a short query scores near zero.
// word_similarity() compares the query to part of the title, which is what typeahead needs.
export function buildSuggestionSql(raw: string): SQL | null {
  const term = normalizeSearchQuery(raw);
  if (!term || term.length < config.suggestionMinLength) return null;

  const limit = config.suggestionLimit;
  return sql`
    select kind, label, slug
    from (
      (
        select 'product'::text as kind,
               ${products.title} as label,
               ${products.slug} as slug,
               greatest(
                 similarity(${products.title}, ${term}),
                 word_similarity(${term}, ${products.title})
               ) as score
        from ${products}
        where ${products.title} % ${term} or ${term} <% ${products.title}
        order by score desc
        limit ${limit}
      )
      union all
      (
        select 'category'::text,
               ${categories.name},
               ${categories.slug},
               greatest(
                 similarity(${categories.name}, ${term}),
                 word_similarity(${term}, ${categories.name})
               )
        from ${categories}
        where ${categories.name} % ${term} or ${term} <% ${categories.name}
        order by 4 desc
        limit ${limit}
      )
      union all
      (
        select 'brand'::text,
               ${products.brand},
               cast(null as text),
               max(greatest(
                 similarity(${products.brand}, ${term}),
                 word_similarity(${term}, ${products.brand})
               ))
        from ${products}
        where ${products.brand} % ${term} or ${term} <% ${products.brand}
        group by ${products.brand}
        order by 4 desc
        limit ${limit}
      )
    ) matches
    order by matches.score desc, matches.kind asc, matches.label asc
    limit ${limit}
  `;
}

export function buildReviewWhere(productId: string, rating?: number): SQL {
  const clauses: SQL[] = [eq(reviews.productId, productId)];
  if (isExactRating(rating)) {
    clauses.push(eq(reviews.rating, rating));
  }
  const combined = and(...clauses);
  if (!combined) {
    throw new Error("Review filter was empty.");
  }
  return combined;
}

export function buildReviewOrderBy(sort: string): SQL[] {
  const resolved = resolveReviewSort(sort);
  const tie = [desc(reviews.createdAt), asc(reviews.id)];

  switch (resolved) {
    case "highest":
      return [desc(reviews.rating), ...tie];
    case "lowest":
      return [asc(reviews.rating), ...tie];
    case "helpful":
      return [desc(reviews.helpfulCount), ...tie];
    case "newest":
      return tie;
    default: {
      const unexpected: never = resolved;
      throw new Error(`Unexpected review sort ${String(unexpected)}`);
    }
  }
}
