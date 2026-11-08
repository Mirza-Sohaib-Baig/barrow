export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  image: string | null;
  priceInPence: number;
  listPriceInPence: number | null;
  ratingAverage: number;
  reviewCount: number;
  stock: number;
};

export type StarFill = 0 | 0.5 | 1;

function clampRating(rating: number): number {
  if (!Number.isFinite(rating)) return 0;
  return Math.min(5, Math.max(0, rating));
}

export function formatRating(rating: number): string {
  return clampRating(rating).toFixed(1);
}

export function formatReviewCount(count: number): string {
  const safe = Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0;
  return new Intl.NumberFormat("en-GB").format(safe);
}

export function ratingLabel(rating: number, count?: number): string {
  if (count === 0) return "No reviews yet";
  const value = formatRating(rating);
  if (count == null) return `Rated ${value} out of 5`;
  const safe = Math.max(0, Math.trunc(count));
  const noun = safe === 1 ? "review" : "reviews";
  return `Rated ${value} out of 5 from ${formatReviewCount(safe)} ${noun}`;
}

export function starFills(rating: number): StarFill[] {
  const nearestHalf = Math.round(clampRating(rating) * 2) / 2;
  return Array.from({ length: 5 }, (_, index) => {
    const remaining = nearestHalf - index;
    const fill: StarFill = remaining >= 1 ? 1 : remaining >= 0.5 ? 0.5 : 0;
    return fill;
  });
}

export function verifiedSavingPence(
  priceInPence: number,
  listPriceInPence: number | null,
): number | null {
  if (listPriceInPence == null) return null;
  if (!Number.isFinite(priceInPence) || !Number.isFinite(listPriceInPence)) return null;
  const price = Math.trunc(priceInPence);
  const list = Math.trunc(listPriceInPence);
  if (list <= price) return null;
  return list - price;
}

export function stockLabel(stock: number): string | null {
  if (!Number.isFinite(stock)) return "Out of stock";
  const count = Math.trunc(stock);
  if (count <= 0) return "Out of stock";
  if (count <= 3) return `Only ${count} left`;
  return null;
}
