import { describe, expect, it } from "vitest";
import { importCategories } from "./categories";
import {
  authorName,
  buildProduct,
  bulletsFrom,
  capProducts,
  cleanBrand,
  listPriceFor,
  parsePriceToPence,
  parseReview,
  productSlug,
  stockFor,
  type KeptReview,
} from "./transform";

const beauty = importCategories[0];
if (!beauty) throw new Error("Beauty category missing");

function review(helpfulCount: number, body = "A real review with enough words."): KeptReview {
  return {
    rating: 5,
    title: "Good",
    body,
    createdAt: new Date("2024-01-01T00:00:00Z"),
    helpfulCount,
    verified: true,
    authorName: "Alex A.",
  };
}

function productRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    parent_asin: "B000TEST01",
    title: "Gentle daily face cream",
    price: "$12.50",
    images: [{ hi_res: "https://m.media-amazon.com/images/I/example.jpg", large: null, thumb: null }],
    features: ["Soft finish"],
    description: ["A short description of the cream."],
    store: "Example Format: Audio CD",
    categories: ["Beauty", "Skin Care"],
    details: '{"Scent":"None"}',
    ...overrides,
  };
}

describe("parsePriceToPence", () => {
  it("turns a dollar string into integer pence", () => {
    expect(parsePriceToPence("$1,299.50")).toBe(129950);
    expect(parsePriceToPence("12.9")).toBe(1290);
    expect(parsePriceToPence(19.99)).toBe(1999);
  });

  it("rejects missing, zero and unparseable prices", () => {
    expect(parsePriceToPence("")).toBeNull();
    expect(parsePriceToPence("None")).toBeNull();
    expect(parsePriceToPence("0")).toBeNull();
    expect(parsePriceToPence("abc")).toBeNull();
    expect(parsePriceToPence("12.999")).toBeNull();
  });
});

describe("reviews", () => {
  it("drops an empty body, a long body, and any reviewer id", () => {
    expect(parseReview({ text: "   ", rating: 5, timestamp: 1_700_000_000_000 }, "B1")).toBeNull();
    expect(
      parseReview({ text: "x".repeat(2001), rating: 5, timestamp: 1_700_000_000_000, user_id: "secret" }, "B1"),
    ).toBeNull();
    const kept = parseReview(
      { text: "Works well on dry skin.", rating: 4, timestamp: 1_700_000_000_000, helpful_vote: 3, verified_purchase: true, user_id: "secret" },
      "B1",
    );
    expect(kept?.body).toBe("Works well on dry skin.");
    expect(kept?.authorName).toMatch(/^[A-Z][a-z]+ [A-Z]\.$/);
    expect(JSON.stringify(kept)).not.toContain("secret");
  });

  it("uses the same generated name for the same review", () => {
    const row = { text: "Works well on dry skin.", rating: 4, timestamp: 1_700_000_000_000 };
    expect(authorName("seed")).toBe(authorName("seed"));
    expect(parseReview(row, "B1")?.authorName).toBe(parseReview(row, "B1")?.authorName);
  });
});

describe("products", () => {
  const reviews = new Map<string, KeptReview[]>([["B000TEST01", [review(1), review(2), review(3)]]]);

  it("keeps a product that has an image, a price, a title and three reviews", () => {
    const draft = buildProduct(productRow(), reviews, beauty);
    expect(draft?.priceInPence).toBe(1250);
    expect(draft?.brand).toBe("Example");
    expect(draft?.subcategorySlug).toBe("beauty-skincare");
    expect(draft?.slug.startsWith("gentle-daily-face-cream-")).toBe(true);
  });

  it("rejects a product that fails any keep rule", () => {
    expect(buildProduct(productRow({ images: [] }), reviews, beauty)).toBeNull();
    expect(buildProduct(productRow({ price: "none" }), reviews, beauty)).toBeNull();
    expect(buildProduct(productRow({ title: "Too short" }), reviews, beauty)).toBeNull();
    expect(buildProduct(productRow(), new Map(), beauty)).toBeNull();
  });

  it("caps at the products with the most reviews and keeps slugs unique", () => {
    const drafts = Array.from({ length: 5 }, (_, index) => {
      const built = buildProduct(
        productRow({ parent_asin: `B000TEST0${index}`, title: "Gentle daily face cream" }),
        new Map([[`B000TEST0${index}`, Array.from({ length: index + 3 }, () => review(1))]]),
        beauty,
      );
      if (!built) throw new Error("expected a draft");
      return built;
    });
    const capped = capProducts(drafts, 2);
    expect(capped).toHaveLength(2);
    expect(capped[0]?.reviews).toHaveLength(7);
    expect(new Set(capped.map((draft) => draft.slug)).size).toBe(2);
  });

  it("keeps a bullet under 200 characters without splitting an emoji", () => {
    const bullet = bulletsFrom([`${"a".repeat(199)}\uD83E\uDDD4`])[0] ?? "";
    expect(bullet.length).toBeLessThanOrEqual(200);
    expect(bullet.charCodeAt(bullet.length - 1)).toBeLessThan(0xd800);
  });

  it("derives list price and stock from the parent asin", () => {
    expect(listPriceFor(1000, "B000TEST01")).toBe(listPriceFor(1000, "B000TEST01"));
    expect(stockFor("B000TEST01")).toBe(stockFor("B000TEST01"));
    expect(productSlug("Same title", "one")).not.toBe(productSlug("Same title", "two"));
    expect(cleanBrand("Format: Audio CD")).toBe("Unbranded");
  });
});
