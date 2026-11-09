import { cacheLife, cacheTag } from "next/cache";
import { and, asc, count, eq, isNull, ne, sql } from "drizzle-orm";
import { categories, products } from "@/drizzle/schema";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import type { ProductCard } from "@/lib/product-card";
import {
  buildFacetStatement,
  buildProductOrderBy,
  buildProductWhere,
  buildSuggestionSql,
  cardRanking,
  categoryClause,
  dealClause,
  dealRanking,
  pageCount,
  pageWindow,
  type ProductCardOptions,
  type ProductListOptions,
  type ProductSort,
} from "@/lib/queries/catalogue-clauses";
import { allocateHomeRailSizes, capHomeRails, clampRailLimit } from "@/lib/queries/home-budget";

export type { ProductCard } from "@/lib/product-card";
export type { ProductCardOptions, ProductListOptions, ProductSort };
export { allocateHomeRailSizes };

export type ProductCardPage = {
  items: ProductCard[];
  total: number;
  page: number;
  totalPages: number;
};

export type CategoryFacet = {
  slug: string;
  name: string;
  count: number;
};

export type BrandFacet = {
  name: string;
  count: number;
};

export type RatingFacet = {
  minRating: number;
  count: number;
};

export type Facets = {
  categories: CategoryFacet[];
  brands: BrandFacet[];
  price: { min: number | null; max: number | null };
  ratings: RatingFacet[];
};

export type ProductDetail = {
  id: string;
  slug: string;
  title: string;
  description: string;
  bullets: string[];
  specs: Record<string, string>;
  brand: string;
  priceInPence: number;
  listPriceInPence: number | null;
  ratingAverage: number;
  reviewCount: number;
  stock: number;
  imageUrls: string[];
  category: { id: string; name: string; slug: string };
  related: ProductCard[];
};

export type HomeCategoryTile = {
  id: string;
  name: string;
  slug: string;
  imageUrl: string | null;
};

export type ProductRail = {
  title: string;
  slug: string | null;
  items: ProductCard[];
};

export type HomeData = {
  categories: HomeCategoryTile[];
  deals: ProductRail;
  categoryRails: ProductRail[];
};

export type Suggestion =
  | { kind: "product"; label: string; slug: string; image: string | null; priceInPence: number }
  | { kind: "category"; label: string; slug: string }
  | { kind: "brand"; label: string; slug: null };

const cardFields = {
  id: products.id,
  slug: products.slug,
  title: products.title,
  image: sql<string | null>`${products.imageUrls}->>0`,
  priceInPence: products.priceInPence,
  listPriceInPence: products.listPriceInPence,
  ratingAverage: products.ratingAverage,
  reviewCount: products.reviewCount,
  stock: products.stock,
};

function toCard(row: {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  priceInPence: number;
  listPriceInPence: number | null;
  ratingAverage: number;
  reviewCount: number;
  stock: number;
}): ProductCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    image: row.image ? row.image : null,
    priceInPence: row.priceInPence,
    listPriceInPence: row.listPriceInPence,
    ratingAverage: row.ratingAverage,
    reviewCount: row.reviewCount,
    stock: row.stock,
  };
}

function readCount(value: unknown): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

function readIntOrNull(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
}

function readText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, "en-GB");
}

async function readCards(
  where: ReturnType<typeof buildProductWhere>,
  orderBy: ReturnType<typeof buildProductOrderBy>,
  limit: number,
  offset: number,
): Promise<ProductCard[]> {
  const rows = await db
    .select(cardFields)
    .from(products)
    .where(where)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);
  return rows.map(toCard);
}

async function readDeals(limit: number): Promise<ProductCard[]> {
  const size = clampRailLimit(limit);
  if (size === 0) return [];
  return readCards(dealClause(), dealRanking(), size, 0);
}

async function readCategoryRail(slug: string, limit: number): Promise<ProductCard[]> {
  const size = clampRailLimit(limit);
  const categorySlug = slug.trim();
  if (size === 0 || !categorySlug) return [];
  return readCards(categoryClause(categorySlug), cardRanking(), size, 0);
}

async function readTopCategories(): Promise<HomeCategoryTile[]> {
  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      imageUrl: categories.imageUrl,
    })
    .from(categories)
    .where(isNull(categories.parentId))
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}

export async function getProductCards(opts: ProductCardOptions): Promise<ProductCardPage> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  const categorySlug = opts.categorySlug?.trim();
  if (categorySlug) cacheTag(`category:${categorySlug}`);

  const where = buildProductWhere(opts);
  const orderBy = buildProductOrderBy(opts.sort, opts.query);
  const window = pageWindow(opts.page, config.pageSize);

  const totals = db.select({ total: count() }).from(products).where(where);
  const [items, totalRows] = await Promise.all([
    readCards(where, orderBy, window.limit, window.offset),
    totals,
  ]);
  const total = readCount(totalRows[0]?.total);

  return {
    items,
    total,
    page: window.page,
    totalPages: pageCount(total, window.limit),
  };
}

export async function getFacets(opts: ProductListOptions): Promise<Facets> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  const categorySlug = opts.categorySlug?.trim();
  if (categorySlug) cacheTag(`category:${categorySlug}`);

  const result = await db.execute(buildFacetStatement(opts));
  const rows = facetRows(result);

  const categories: CategoryFacet[] = [];
  const brands: BrandFacet[] = [];
  const ratingCounts = new Map<number, number>([
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);
  let priceMin: number | null = null;
  let priceMax: number | null = null;

  for (const row of rows) {
    if (row.kind === "category") {
      const slug = readText(row.key);
      const name = readText(row.label);
      if (!slug || !name) continue;
      categories.push({ slug, name, count: readCount(row.count) });
      continue;
    }
    if (row.kind === "brand") {
      const name = readText(row.key);
      if (!name) continue;
      brands.push({ name, count: readCount(row.count) });
      continue;
    }
    if (row.kind === "price") {
      priceMin = readIntOrNull(row.min_price);
      priceMax = readIntOrNull(row.max_price);
      continue;
    }
    if (row.kind === "rating") {
      const minRating = readIntOrNull(row.key);
      if (minRating === null || !ratingCounts.has(minRating)) continue;
      ratingCounts.set(minRating, readCount(row.count));
    }
  }

  categories.sort((left, right) => right.count - left.count || compareText(left.name, right.name));
  brands.sort((left, right) => right.count - left.count || compareText(left.name, right.name));

  const ratings = [4, 3, 2, 1].map((minRating) => ({
    minRating,
    count: ratingCounts.get(minRating) ?? 0,
  }));

  return {
    categories,
    brands,
    price: { min: priceMin, max: priceMax },
    ratings,
  };
}

export async function getProductBySlug(slug: string): Promise<ProductDetail | null> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  const key = slug.trim();
  if (key) cacheTag(`product:${key}`);
  if (!key) return null;

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      description: products.description,
      bullets: products.bullets,
      specs: products.specs,
      brand: products.brand,
      priceInPence: products.priceInPence,
      listPriceInPence: products.listPriceInPence,
      ratingAverage: products.ratingAverage,
      reviewCount: products.reviewCount,
      stock: products.stock,
      imageUrls: products.imageUrls,
      categoryId: categories.id,
      categoryName: categories.name,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.slug, key))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  cacheTag(`category:${row.categorySlug}`);

  const relatedRows = await db
    .select(cardFields)
    .from(products)
    .where(and(eq(products.categoryId, row.categoryId), ne(products.id, row.id)))
    .orderBy(...cardRanking())
    .limit(config.relatedProductCount);

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    bullets: row.bullets,
    specs: row.specs,
    brand: row.brand,
    priceInPence: row.priceInPence,
    listPriceInPence: row.listPriceInPence,
    ratingAverage: row.ratingAverage,
    reviewCount: row.reviewCount,
    stock: row.stock,
    imageUrls: row.imageUrls,
    category: {
      id: row.categoryId,
      name: row.categoryName,
      slug: row.categorySlug,
    },
    related: relatedRows.map(toCard),
  };
}

export async function getHomeCategories(): Promise<HomeCategoryTile[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  const tiles = await readTopCategories();
  for (const tile of tiles) {
    cacheTag(`category:${tile.slug}`);
  }
  return tiles;
}

export async function getDealsRail(opts: { limit: number }): Promise<ProductCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  return readDeals(opts.limit);
}

export async function getCategoryRail(opts: { slug: string; limit: number }): Promise<ProductCard[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");
  const categorySlug = opts.slug.trim();
  if (categorySlug) cacheTag(`category:${categorySlug}`);
  return readCategoryRail(opts.slug, opts.limit);
}

export async function getHomeData(): Promise<HomeData> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  const tiles = await readTopCategories();
  for (const tile of tiles) {
    cacheTag(`category:${tile.slug}`);
  }

  const plan = allocateHomeRailSizes(tiles.length);
  const railTiles = tiles.slice(0, plan.categoryRails);
  const [dealItems, railItems] = await Promise.all([
    readDeals(plan.deals),
    Promise.all(railTiles.map((tile) => readCategoryRail(tile.slug, plan.perCategory))),
  ]);
  const capped = capHomeRails(
    dealItems,
    railItems,
  );

  return {
    categories: tiles,
    deals: { title: "Deals", slug: null, items: capped.deals },
    categoryRails: railTiles.map((tile, index) => ({
      title: tile.name,
      slug: tile.slug,
      items: capped.rails[index] ?? [],
    })),
  };
}

export async function getSuggestions(q: string): Promise<Suggestion[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  const statement = buildSuggestionSql(q);
  if (!statement) return [];

  const result = await db.execute(statement);
  const suggestions: Suggestion[] = [];

  for (const row of suggestionRows(result)) {
    const label = readText(row.label);
    if (!label) continue;
    if (row.kind === "brand") {
      suggestions.push({ kind: "brand", label, slug: null });
      continue;
    }
    const slug = readText(row.slug);
    if (!slug) continue;
    if (row.kind === "product") {
      const price = typeof row.price === "number" || typeof row.price === "string" ? Number(row.price) : 0;
      suggestions.push({
        kind: "product",
        label,
        slug,
        image: readText(row.image),
        priceInPence: Number.isInteger(price) && price >= 0 ? price : 0,
      });
      continue;
    }
    if (row.kind === "category") {
      suggestions.push({ kind: "category", label, slug });
    }
  }

  return suggestions.slice(0, config.suggestionLimit);
}

type FacetRow = {
  kind: string;
  key: unknown;
  label: unknown;
  count: unknown;
  min_price: unknown;
  max_price: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function resultRows(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (isRecord(result) && Array.isArray(result.rows)) return result.rows;
  return [];
}

function facetRows(result: unknown): FacetRow[] {
  const rows: FacetRow[] = [];
  for (const value of resultRows(result)) {
    if (!isRecord(value) || typeof value.kind !== "string") continue;
    rows.push({
      kind: value.kind,
      key: value.key,
      label: value.label,
      count: value.count,
      min_price: value.min_price,
      max_price: value.max_price,
    });
  }
  return rows;
}

function suggestionRows(
  result: unknown,
): { kind: string; label: unknown; slug: unknown; image: unknown; price: unknown }[] {
  const rows: { kind: string; label: unknown; slug: unknown; image: unknown; price: unknown }[] = [];
  for (const value of resultRows(result)) {
    if (!isRecord(value) || typeof value.kind !== "string") continue;
    rows.push({
      kind: value.kind,
      label: value.label,
      slug: value.slug,
      image: value.image,
      price: value.price_in_pence,
    });
  }
  return rows;
}
