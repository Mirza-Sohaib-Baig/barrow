import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import {
  productHref,
  type ProductQuery,
  type StarRatingFilter,
} from "@/components/product/product-params";
import { StarRating } from "@/components/product/star-rating";
import { formatDate } from "@/lib/format";
import { formatReviewCount } from "@/lib/product-card";
import type { RatingHistogram, ReviewPage } from "@/lib/queries/reviews";
import type { ReviewSort } from "@/lib/queries/catalogue-clauses";
import { cn } from "@/lib/utils";

const sortChoices: { sort: ReviewSort; label: string }[] = [
  { sort: "helpful", label: "Helpful" },
  { sort: "newest", label: "Newest" },
  { sort: "highest", label: "Highest" },
  { sort: "lowest", label: "Lowest" },
];

function pageLinkClass(disabled: boolean) {
  return cn(
    "inline-flex min-h-10 items-center rounded-lg border border-border px-3 text-small",
    focusRingClass,
    disabled ? "pointer-events-none text-muted-foreground" : "bg-card hover:bg-muted",
  );
}

function starFilter(rating: number): StarRatingFilter | null {
  if (rating === 1 || rating === 2 || rating === 3 || rating === 4 || rating === 5) return rating;
  return null;
}

function helpfulCopy(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  const noun = safe === 1 ? "person" : "people";
  return `${formatReviewCount(safe)} ${noun} found this helpful`;
}

function ReviewPagination({
  slug,
  query,
  page,
  pageCount,
}: {
  slug: string;
  query: ProductQuery;
  page: number;
  pageCount: number;
}) {
  if (pageCount <= 1) return null;

  const previous = page > 1 ? productHref(slug, query, { tab: "reviews", page: page - 1 }) : null;
  const next = page < pageCount ? productHref(slug, query, { tab: "reviews", page: page + 1 }) : null;

  return (
    <nav aria-label="Reviews pagination" className="flex items-center justify-between gap-4">
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

export function ReviewsPanel({
  slug,
  query,
  histogram,
  reviews,
}: {
  slug: string;
  query: ProductQuery;
  histogram: RatingHistogram;
  reviews: ReviewPage;
}) {
  if (histogram.total === 0) {
    return <p className="text-body text-muted-foreground">There are no reviews yet.</p>;
  }

  const max = histogram.ratings.reduce((peak, bucket) => Math.max(peak, bucket.count), 0);
  const buckets = [...histogram.ratings].sort((left, right) => right.rating - left.rating);

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Customer reviews</h2>
      <nav aria-label="Filter by rating" className="flex flex-col gap-2">
        {buckets.map((bucket) => {
          const rating = starFilter(bucket.rating);
          if (!rating) return null;
          const selected = query.rating === rating;
          const width = max === 0 ? 0 : (bucket.count / max) * 100;
          const stars = rating === 1 ? "1 star" : `${rating} stars`;
          return (
            <Link
              key={rating}
              href={productHref(slug, query, {
                tab: "reviews",
                rating: selected ? null : rating,
                page: 1,
              })}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "flex min-h-10 items-center gap-3 rounded-lg px-1 text-small",
                focusRingClass,
                selected ? "font-medium" : "hover:bg-muted",
              )}
            >
              <span className="w-14 shrink-0">{stars}</span>
              <span className="relative h-2 min-w-0 flex-1 rounded-full bg-muted" aria-hidden="true">
                <span
                  className="absolute inset-y-0 left-0 rounded-full bg-foreground"
                  style={{ width: `${width}%` }}
                />
              </span>
              <span className="tnum w-10 shrink-0 text-right">{formatReviewCount(bucket.count)}</span>
              <span className={cn("w-16 shrink-0", !selected && "invisible")} aria-hidden={!selected}>
                Selected
              </span>
            </Link>
          );
        })}
      </nav>
      <nav aria-label="Sort reviews" className="flex flex-wrap gap-2">
        {sortChoices.map((choice) => {
          const active = query.sort === choice.sort;
          return (
            <Link
              key={choice.sort}
              href={productHref(slug, query, { tab: "reviews", sort: choice.sort, page: 1 })}
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
      {reviews.items.length === 0 ? (
        <div className="flex flex-col items-start gap-3">
          <p className="text-body text-muted-foreground">
            {query.rating
              ? `No reviews with ${query.rating} ${query.rating === 1 ? "star" : "stars"}.`
              : "No reviews on this page."}
          </p>
          {query.rating ? (
            <Link
              href={productHref(slug, query, { tab: "reviews", rating: null, page: 1 })}
              className={cn("text-body underline underline-offset-4", focusRingClass)}
            >
              Show all reviews
            </Link>
          ) : null}
        </div>
      ) : (
        <ul className="flex flex-col">
          {reviews.items.map((review) => {
            const date = new Date(review.createdAt);
            return (
              <li key={review.id} className="flex flex-col gap-2 border-b border-border py-4">
                <p className="text-small text-muted-foreground">{review.authorName}</p>
                <StarRating rating={review.rating} />
                <p className="text-h3">{review.title}</p>
                <p className="text-body whitespace-pre-line">{review.body}</p>
                {review.isVerified ? <p className="text-small">Verified purchase</p> : null}
                <p className="text-small text-muted-foreground">{helpfulCopy(review.helpfulCount)}</p>
                <time className="text-small text-muted-foreground" dateTime={date.toISOString()}>
                  {formatDate(date)}
                </time>
              </li>
            );
          })}
        </ul>
      )}
      <ReviewPagination slug={slug} query={query} page={reviews.page} pageCount={reviews.totalPages} />
    </div>
  );
}
