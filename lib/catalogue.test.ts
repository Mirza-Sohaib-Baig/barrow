import { describe, expect, it } from "vitest";
import {
  catalogueHref,
  emptyCatalogueCopy,
  likelyCulprit,
  parseCatalogueFilters,
  toggleBrand,
  toProductCardOptions,
  type CatalogueFilters,
} from "@/lib/catalogue";
import { formatPrice } from "@/lib/format";

const priced: CatalogueFilters = {
  brands: ["Nike"],
  minPrice: 2500,
  maxPrice: 5000,
  minRating: 4,
  inStock: true,
  sort: "price-asc",
  page: 3,
};

describe("parseCatalogueFilters", () => {
  it("reads a linkable filter set and ignores values that are not filters", () => {
    expect(
      parseCatalogueFilters({
        brand: [" Nike ", "Nike", "Ada"],
        min: "5000",
        max: "2500",
        rating: "4",
        stock: "in",
        sort: "price-asc",
        page: "3",
      }),
    ).toEqual({
      brands: ["Ada", "Nike"],
      minPrice: 2500,
      maxPrice: 5000,
      minRating: 4,
      inStock: true,
      sort: "price-asc",
      page: 3,
    });
  });

  it("falls back when a param is not a real filter", () => {
    expect(
      parseCatalogueFilters({
        min: "19.99",
        rating: "9",
        sort: "featured",
        page: "0",
        stock: "yes",
      }),
    ).toEqual({
      brands: [],
      minPrice: null,
      maxPrice: null,
      minRating: null,
      inStock: false,
      sort: "relevance",
      page: 1,
    });
  });

  it("round-trips through the href", () => {
    const filters = parseCatalogueFilters({
      brand: ["Nike", "Ada"],
      min: "2500",
      max: "5000",
      rating: "4",
      stock: "in",
      sort: "newest",
      page: "2",
    });
    const href = catalogueHref("/c/home", filters);
    const params = new URLSearchParams(href.split("?")[1]);
    expect(
      parseCatalogueFilters({
        brand: params.getAll("brand"),
        min: params.get("min") ?? undefined,
        max: params.get("max") ?? undefined,
        rating: params.get("rating") ?? undefined,
        stock: params.get("stock") ?? undefined,
        sort: params.get("sort") ?? undefined,
        page: params.get("page") ?? undefined,
      }),
    ).toEqual(filters);
  });
});

describe("catalogueHref", () => {
  it("drops default sort and the first page", () => {
    expect(
      catalogueHref("/c/kitchen", {
        brands: [],
        minPrice: null,
        maxPrice: null,
        minRating: null,
        inStock: false,
        sort: "relevance",
        page: 1,
      }),
    ).toBe("/c/kitchen");
  });

  it("resets to the first page when a filter changes", () => {
    expect(catalogueHref("/c/home", priced, { brands: toggleBrand(priced, "Nike") })).toBe(
      "/c/home?min=2500&max=5000&rating=4&stock=in&sort=price-asc",
    );
  });
});

describe("likelyCulprit", () => {
  it("names the price band ahead of the other filters and clears only that band", () => {
    const culprit = likelyCulprit("/c/home", priced);
    expect(culprit?.filterName).toBe("£25 to £50 filter");
    expect(culprit?.href).toBe("/c/home?brand=Nike&rating=4&stock=in&sort=price-asc");
  });

  it("names a single brand when price is not set", () => {
    const culprit = likelyCulprit("/c/beauty", { ...priced, minPrice: null, maxPrice: null });
    expect(culprit?.filterName).toBe("Nike filter");
    expect(culprit?.href).not.toContain("brand=");
  });

  it("describes a custom price range with the shop formatter", () => {
    const culprit = likelyCulprit("/c/home", {
      ...priced,
      brands: [],
      minPrice: 1000,
      maxPrice: 2000,
      minRating: null,
      inStock: false,
    });
    expect(culprit?.filterName).toBe(`${formatPrice(1000)} to ${formatPrice(2000)} filter`);
  });

  it("has nothing to clear when the department itself is empty", () => {
    const filters: CatalogueFilters = {
      brands: [],
      minPrice: null,
      maxPrice: null,
      minRating: null,
      inStock: false,
      sort: "relevance",
      page: 1,
    };
    expect(likelyCulprit("/c/toys", filters)).toBeNull();
    expect(emptyCatalogueCopy("Toys", null)).toEqual({
      text: "Nothing in Toys yet.",
      action: "Back to the shop",
      href: "/",
    });
  });

  it("offers a one-click clear for the in-stock filter", () => {
    const copy = emptyCatalogueCopy("Garden", {
      filterName: "in stock filter",
      href: "/c/garden",
    });
    expect(copy.text).toBe("No results in Garden. Try removing the in stock filter.");
    expect(copy.action).toBe("Remove the in stock filter");
    expect(copy.href).toBe("/c/garden");
  });
});

describe("toProductCardOptions", () => {
  it("passes pence and the query sort through unchanged", () => {
    expect(toProductCardOptions("home", priced)).toEqual({
      categorySlug: "home",
      brands: ["Nike"],
      minPrice: 2500,
      maxPrice: 5000,
      minRating: 4,
      inStockOnly: true,
      sort: "price-asc",
      page: 3,
    });
  });
});
