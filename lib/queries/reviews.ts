import { cacheLife, cacheTag } from "next/cache";
import { count, eq } from "drizzle-orm";
import { categories, products, reviews } from "@/drizzle/schema";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import {
  buildReviewOrderBy,
  buildReviewWhere,
  pageCount,
  pageWindow,
  type ReviewListOptions,
  type ReviewSort,
} from "@/lib/queries/catalogue-clauses";

export type { ReviewListOptions, ReviewSort };

export type ReviewItem = {
  id: string;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  isVerified: boolean;
  helpfulCount: number;
  createdAt: Date;
};

export type ReviewPage = {
  items: ReviewItem[];
  total: number;
  page: number;
  totalPages: number;
};

export type RatingHistogram = {
  ratings: { rating: number; count: number }[];
  total: number;
};

const reviewFields = {
  id: reviews.id,
  authorName: reviews.authorName,
  rating: reviews.rating,
  title: reviews.title,
  body: reviews.body,
  isVerified: reviews.isVerified,
  helpfulCount: reviews.helpfulCount,
  createdAt: reviews.createdAt,
};

function readCount(value: unknown): number {
  const parsed = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  if (!Number.isFinite(parsed) || parsed < 0) return 0;
  return Math.trunc(parsed);
}

async function readProductScope(productId: string): Promise<{
  slug: string;
  categorySlug: string;
} | null> {
  const rows = await db
    .select({
      slug: products.slug,
      categorySlug: categories.slug,
    })
    .from(products)
    .innerJoin(categories, eq(products.categoryId, categories.id))
    .where(eq(products.id, productId))
    .limit(1);

  return rows[0] ?? null;
}

function tagProduct(scope: { slug: string; categorySlug: string } | null) {
  cacheTag("catalogue");
  if (!scope) return;
  cacheTag(`product:${scope.slug}`, `category:${scope.categorySlug}`);
}

export async function getReviews(productId: string, opts: ReviewListOptions): Promise<ReviewPage> {
  "use cache";
  cacheLife("hours");

  const scope = await readProductScope(productId);
  tagProduct(scope);

  const window = pageWindow(opts.page, config.reviewPageSize);
  if (!scope) {
    return { items: [], total: 0, page: window.page, totalPages: 0 };
  }

  const where = buildReviewWhere(productId, opts.rating);
  const orderBy = buildReviewOrderBy(opts.sort);
  const [items, totalRows] = await Promise.all([
    db
      .select(reviewFields)
      .from(reviews)
      .where(where)
      .orderBy(...orderBy)
      .limit(window.limit)
      .offset(window.offset),
    db.select({ total: count() }).from(reviews).where(where),
  ]);
  const total = readCount(totalRows[0]?.total);

  return {
    items,
    total,
    page: window.page,
    totalPages: pageCount(total, window.limit),
  };
}

export async function getRatingHistogram(productId: string): Promise<RatingHistogram> {
  "use cache";
  cacheLife("hours");

  const scope = await readProductScope(productId);
  tagProduct(scope);

  const counts = new Map<number, number>([
    [5, 0],
    [4, 0],
    [3, 0],
    [2, 0],
    [1, 0],
  ]);

  if (scope) {
    const rows = await db
      .select({ rating: reviews.rating, count: count() })
      .from(reviews)
      .where(eq(reviews.productId, productId))
      .groupBy(reviews.rating);

    for (const row of rows) {
      if (!counts.has(row.rating)) continue;
      counts.set(row.rating, readCount(row.count));
    }
  }

  const ratings = [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: counts.get(rating) ?? 0,
  }));
  const total = ratings.reduce((sum, bucket) => sum + bucket.count, 0);
  return { ratings, total };
}
