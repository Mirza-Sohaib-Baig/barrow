import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import { createGunzip } from "node:zlib";
import { config } from "@/lib/config";
import { childSlug, type ImportCategory, type Subcategory } from "./categories";

const limits = config.catalogueImport;

export type KeptReview = {
  rating: number;
  title: string;
  body: string;
  createdAt: Date;
  helpfulCount: number;
  verified: boolean;
  authorName: string;
};

export type ProductDraft = {
  parentAsin: string;
  title: string;
  description: string;
  bullets: string[];
  specs: Record<string, string>;
  brand: string;
  priceInPence: number;
  listPriceInPence: number | null;
  stock: number;
  imageUrls: string[];
  slug: string;
  subcategorySlug: string;
  reviews: KeptReview[];
};

const GIVEN_NAMES = [
  "Alex",
  "Sam",
  "Jordan",
  "Taylor",
  "Riley",
  "Casey",
  "Morgan",
  "Quinn",
  "Avery",
  "Parker",
  "Rowan",
  "Hayden",
  "Reese",
  "Elliot",
  "Jamie",
  "Drew",
  "Harper",
  "Logan",
  "Micah",
  "Noah",
  "Sage",
] as const;

export function hashInt(value: string): number {
  const hex = createHash("sha256").update(value).digest("hex").slice(0, 8);
  return Number.parseInt(hex, 16);
}

function plain(value: string): string {
  return value.replace(/\u0000/g, "").replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g, "");
}

function clip(value: string, max: number): string {
  const clean = plain(value);
  if (clean.length <= max) return clean;
  const cut = clean.charCodeAt(max - 1);
  const end = cut >= 0xd800 && cut <= 0xdbff ? max - 1 : max;
  return clean.slice(0, end);
}

export function parsePriceToPence(raw: unknown): number | null {
  const text =
    typeof raw === "number" && Number.isFinite(raw) && raw > 0
      ? raw.toFixed(2)
      : typeof raw === "string"
        ? raw.trim()
        : "";
  if (!text || text.toLowerCase() === "none" || text.toLowerCase() === "null") return null;
  const cleaned = text.replace(/[$£€,\s]/g, "");
  const match = /^(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned);
  if (!match) return null;
  const pounds = Number(match[1]);
  const fraction = (match[2] ?? "").padEnd(2, "0");
  const pence = pounds * 100 + Number(fraction);
  if (!Number.isSafeInteger(pence) || pence <= 0) return null;
  return pence;
}

export function listPriceFor(priceInPence: number, parentAsin: string): number | null {
  const roll = hashInt(`${parentAsin}:list`);
  if (roll % 3 !== 0) return null;
  const percent = 10 + (roll % 31);
  const extra = Math.floor((priceInPence * percent + 50) / 100);
  return priceInPence + Math.max(extra, 1);
}

export function stockFor(parentAsin: string): number {
  const roll = hashInt(`${parentAsin}:stock`);
  const bucket = roll % 100;
  if (bucket < 5) return 0;
  if (bucket < 15) return 1 + (roll % 3);
  return 10 + (roll % 191);
}

export function productSlug(title: string, parentAsin: string): string {
  const base = title
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  const suffix = createHash("sha256").update(parentAsin).digest("hex").slice(0, 6);
  return `${base || "product"}-${suffix}`;
}

export function cleanBrand(store: unknown): string {
  if (typeof store !== "string") return "Unbranded";
  const cleaned = plain(store).replace(/\s*format\s*:.*/i, "").trim();
  if (!cleaned) return "Unbranded";
  return clip(cleaned, 120);
}

export function bulletsFrom(features: unknown): string[] {
  if (!Array.isArray(features)) return [];
  const bullets: string[] = [];
  for (const feature of features) {
    if (typeof feature !== "string") continue;
    const text = clip(plain(feature).trim().replace(/\s+/g, " "), limits.maxBullet);
    if (!text) continue;
    bullets.push(text);
    if (bullets.length === limits.maxBullets) break;
  }
  return bullets;
}

function specValue(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text ? clip(plain(text), 200) : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "true" : "false";
  return null;
}

export function specsFrom(details: unknown): Record<string, string> {
  let parsed = details;
  if (typeof details === "string") {
    const trimmed = details.trim();
    if (!trimmed) return {};
    try {
      parsed = JSON.parse(trimmed) as unknown;
    } catch {
      return {};
    }
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
  const specs: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (Object.keys(specs).length >= limits.maxSpecKeys) break;
    const name = clip(plain(key).trim(), 80);
    const text = specValue(value);
    if (!name || !text) continue;
    specs[name] = text;
  }
  return specs;
}

function usableUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

export function imageUrlsFrom(images: unknown): string[] {
  let parsed = images;
  if (typeof images === "string") {
    try {
      parsed = JSON.parse(images) as unknown;
    } catch {
      return usableUrl(images) ? [images.trim()] : [];
    }
  }
  if (!Array.isArray(parsed)) return [];
  const urls: string[] = [];
  for (const image of parsed) {
    if (typeof image === "string") {
      if (usableUrl(image) && !urls.includes(image.trim())) urls.push(image.trim());
    } else if (image && typeof image === "object") {
      const row = image as Record<string, unknown>;
      const url = [row.hi_res, row.large, row.thumb].find(usableUrl);
      if (url && !urls.includes(url.trim())) urls.push(url.trim());
    }
    if (urls.length === 6) break;
  }
  return urls;
}

function textParts(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

export function descriptionFrom(description: unknown, bullets: string[], title: string): string {
  const joined = textParts(description)
    .map((part) => part.trim())
    .filter(Boolean)
    .join("\n\n");
  const text = joined || bullets.join(" ") || title;
  return clip(plain(text), limits.maxDescription);
}

function keywordHit(haystack: string, keyword: string): boolean {
  if (keyword.length <= 4) {
    return new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(haystack);
  }
  return haystack.toLowerCase().includes(keyword.toLowerCase());
}

export function pickSubcategory(
  title: string,
  categoryText: string,
  subcategories: readonly Subcategory[],
): Subcategory {
  const haystack = `${title} ${categoryText}`;
  let chosen = subcategories[0];
  for (const subcategory of subcategories) {
    if (subcategory.keywords.some((keyword) => keywordHit(haystack, keyword))) {
      chosen = subcategory;
    }
  }
  return chosen;
}

function asRating(value: unknown): number | null {
  const rating = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return null;
  return rating;
}

function asDate(value: unknown): Date | null {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return null;
  const milliseconds = numeric > 10_000_000_000 ? numeric : numeric * 1000;
  const date = new Date(milliseconds);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function authorName(seed: string): string {
  const roll = hashInt(seed);
  const given = GIVEN_NAMES[roll % GIVEN_NAMES.length];
  const initial = String.fromCharCode(65 + (Math.floor(roll / GIVEN_NAMES.length) % 26));
  return `${given} ${initial}.`;
}

export function parseReview(row: Record<string, unknown>, parentAsin: string): KeptReview | null {
  const body = typeof row.text === "string" ? plain(row.text).trim() : "";
  if (!body || body.length > limits.maxReviewBody) return null;
  const rating = asRating(row.rating);
  const createdAt = asDate(row.timestamp);
  if (rating === null || !createdAt) return null;
  const title = typeof row.title === "string" ? clip(plain(row.title).trim(), 180) : "";
  const helpful = typeof row.helpful_vote === "number" && Number.isFinite(row.helpful_vote) ? Math.max(0, Math.trunc(row.helpful_vote)) : 0;
  return {
    rating,
    title: title || "Review",
    body,
    createdAt,
    helpfulCount: helpful,
    verified: row.verified_purchase === true,
    authorName: authorName(`${parentAsin}|${createdAt.getTime()}|${rating}|${body.slice(0, 80)}`),
  };
}

export function keepReview(bucket: KeptReview[], review: KeptReview): void {
  if (bucket.length < limits.reviewCap) {
    bucket.push(review);
    return;
  }
  let lowest = 0;
  for (let index = 1; index < bucket.length; index += 1) {
    const current = bucket[index];
    const floor = bucket[lowest];
    if (
      current &&
      floor &&
      (current.helpfulCount < floor.helpfulCount ||
        (current.helpfulCount === floor.helpfulCount && current.createdAt < floor.createdAt))
    ) {
      lowest = index;
    }
  }
  const floor = bucket[lowest];
  if (!floor) return;
  if (review.helpfulCount > floor.helpfulCount) bucket[lowest] = review;
}

export function buildProduct(
  row: Record<string, unknown>,
  reviewsByAsin: Map<string, KeptReview[]>,
  category: ImportCategory,
): ProductDraft | null {
  const parentAsin = typeof row.parent_asin === "string" ? row.parent_asin.trim() : "";
  if (!parentAsin) return null;
  const imageUrls = imageUrlsFrom(row.images);
  if (imageUrls.length === 0) return null;
  const priceInPence = parsePriceToPence(row.price);
  if (priceInPence === null) return null;
  const title = typeof row.title === "string" ? plain(row.title).trim().replace(/\s+/g, " ") : "";
  if (title.length < limits.minTitle || title.length > limits.maxTitle) return null;
  const reviews = reviewsByAsin.get(parentAsin);
  if (!reviews || reviews.length < 3) return null;

  const bullets = bulletsFrom(row.features);
  const categoryText = textParts(row.categories).join(" ");
  const subcategory = pickSubcategory(title, categoryText, category.subcategories);
  return {
    parentAsin,
    title,
    description: descriptionFrom(row.description, bullets, title),
    bullets,
    specs: specsFrom(row.details),
    brand: cleanBrand(row.store),
    priceInPence,
    listPriceInPence: listPriceFor(priceInPence, parentAsin),
    stock: stockFor(parentAsin),
    imageUrls,
    slug: productSlug(title, parentAsin),
    subcategorySlug: childSlug(category, subcategory),
    reviews,
  };
}

async function forEachJsonl(
  file: string,
  onRow: (row: Record<string, unknown>) => void,
): Promise<{ rows: number; badLines: number }> {
  const lines = createInterface({
    input: createReadStream(file).pipe(createGunzip()),
    crlfDelay: Infinity,
  });
  let rows = 0;
  let badLines = 0;
  for await (const line of lines) {
    if (!line) continue;
    try {
      onRow(JSON.parse(line) as Record<string, unknown>);
      rows += 1;
    } catch {
      badLines += 1;
    }
    if (rows > 0 && rows % 100_000 === 0) {
      console.log(`${file} ${rows} rows`);
    }
  }
  return { rows, badLines };
}

export async function readCategory(
  reviewFile: string,
  metaFile: string,
  category: ImportCategory,
  productCap: number = limits.productCap,
): Promise<ProductDraft[]> {
  const reviewsByAsin = new Map<string, KeptReview[]>();
  const reviewScan = await forEachJsonl(reviewFile, (row) => {
    const parentAsin = typeof row.parent_asin === "string" ? row.parent_asin.trim() : "";
    if (!parentAsin) return;
    const review = parseReview(row, parentAsin);
    if (!review) return;
    const bucket = reviewsByAsin.get(parentAsin);
    if (bucket) {
      keepReview(bucket, review);
    } else {
      reviewsByAsin.set(parentAsin, [review]);
    }
  });
  console.log(
    `${category.dataset} reviews: ${reviewScan.rows} rows, ${reviewsByAsin.size} products, ${reviewScan.badLines} bad lines`,
  );

  const drafts: ProductDraft[] = [];
  const metaScan = await forEachJsonl(metaFile, (row) => {
    const draft = buildProduct(row, reviewsByAsin, category);
    if (draft) drafts.push(draft);
  });
  console.log(
    `${category.dataset} metadata: ${metaScan.rows} rows, ${drafts.length} kept before cap, ${metaScan.badLines} bad lines`,
  );
  return capProducts(drafts, productCap);
}

export function capProducts(drafts: ProductDraft[], limit: number = limits.productCap): ProductDraft[] {
  const ranked = [...drafts].sort((left, right) => {
    const byReviews = right.reviews.length - left.reviews.length;
    if (byReviews !== 0) return byReviews;
    return left.parentAsin < right.parentAsin ? -1 : left.parentAsin > right.parentAsin ? 1 : 0;
  });
  const chosen = ranked.slice(0, limit);
  const seen = new Set<string>();
  return chosen.map((draft) => {
    let slug = draft.slug;
    let extra = 2;
    while (seen.has(slug)) {
      slug = `${draft.slug}-${extra}`;
      extra += 1;
    }
    seen.add(slug);
    return slug === draft.slug ? draft : { ...draft, slug };
  });
}
