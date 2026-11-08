import { PgDialect } from "drizzle-orm/pg-core";
import type { SQL } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import {
  buildFacetStatement,
  buildProductOrderBy,
  buildProductWhere,
  buildReviewOrderBy,
  buildReviewWhere,
  buildSuggestionSql,
  pageCount,
  pageWindow,
  resolveProductSort,
} from "@/lib/queries/catalogue-clauses";
import {
  allocateHomeRailSizes,
  capHomeRails,
  clampRailLimit,
  displayedHomeLimits,
} from "@/lib/queries/home-budget";

const dialect = new PgDialect();

function render(query: SQL): { sql: string; params: unknown[] } {
  const rendered = dialect.sqlToQuery(query);
  return { sql: rendered.sql, params: [...rendered.params] };
}

function renderWhere(
  options: Parameters<typeof buildProductWhere>[0],
  exclude?: Parameters<typeof buildProductWhere>[1],
) {
  const where = buildProductWhere(options, exclude);
  if (!where) return { sql: "", params: [] as unknown[] };
  return render(where);
}

function renderOrder(sort: string, query?: string) {
  const rendered = buildProductOrderBy(sort, query).map((clause) => dialect.sqlToQuery(clause));
  return {
    sql: rendered.map((entry) => entry.sql).join(", "),
    params: rendered.flatMap((entry) => entry.params),
  };
}

function countValue(params: unknown[], value: unknown): number {
  return params.filter((param) => param === value).length;
}

function firstClause(clauses: SQL[]): SQL {
  const clause = clauses[0];
  if (!clause) {
    throw new Error("Expected a sort clause.");
  }
  return clause;
}

const sampleFilters = {
  categorySlug: " kitchen ",
  query: "  kettle   black  ",
  brands: [" Acme ", "Acme", " ", "Barrow"],
  minPrice: 100,
  maxPrice: 5000,
  minRating: 4,
  inStockOnly: true,
  dealsOnly: true,
};

describe("product filters", () => {
  it("applies each active filter and normalises text", () => {
    const { sql, params } = renderWhere(sampleFilters);

    expect(sql).toContain("with recursive");
    expect(sql).toContain("plainto_tsquery");
    expect(sql).toContain('"products"."brand"');
    expect(sql).toContain('"products"."price_in_pence" >=');
    expect(sql).toContain('"products"."price_in_pence" <=');
    expect(sql).toContain('"products"."rating_average" >=');
    expect(sql).toContain('"products"."stock" >');
    expect(sql).toContain('"products"."list_price_in_pence" >');
    expect(params).toContain("kitchen");
    expect(params).toContain("kettle black");
    expect(params).toContain("Acme");
    expect(params).toContain("Barrow");
    expect(countValue(params, "Acme")).toBe(1);
    expect(params).toContain(100);
    expect(params).toContain(5000);
    expect(params).toContain(4);
    expect(params).toContain(0);
  });

  it("omits filters that were not asked for", () => {
    const { sql, params } = renderWhere({});

    expect(sql).toBe("");
    expect(params).toEqual([]);
  });

  it("ignores an empty brand list, a fractional price, and a rating outside 1 to 5", () => {
    const { sql, params } = renderWhere({
      brands: [" ", ""],
      minPrice: 10.5,
      maxPrice: -1,
      minRating: 0,
    });

    expect(sql).toBe("");
    expect(params).toEqual([]);
  });

  it("caps the search text", () => {
    const { params } = renderWhere({ query: "k".repeat(config.searchQueryMaxLength + 40) });
    const term = params.find((param) => typeof param === "string");
    expect(term).toHaveLength(config.searchQueryMaxLength);
  });

  it("drops a facet's own filter and keeps the others", () => {
    const category = renderWhere(sampleFilters, "category");
    expect(category.sql).not.toContain("with recursive");
    expect(category.params).not.toContain("kitchen");
    expect(category.params).toContain("Acme");
    expect(category.params).toContain(100);
    expect(category.params).toContain(4);
    expect(category.params).toContain("kettle black");

    const brand = renderWhere(sampleFilters, "brand");
    expect(brand.params).not.toContain("Acme");
    expect(brand.params).not.toContain("Barrow");
    expect(brand.params).toContain("kitchen");
    expect(brand.params).toContain(5000);

    const price = renderWhere(sampleFilters, "price");
    expect(price.params).not.toContain(100);
    expect(price.params).not.toContain(5000);
    expect(price.sql).not.toContain('"products"."price_in_pence" >=');
    expect(price.params).toContain("kitchen");
    expect(price.params).toContain(4);

    const rating = renderWhere(sampleFilters, "rating");
    expect(rating.params).not.toContain(4);
    expect(rating.sql).not.toContain('"products"."rating_average"');
    expect(rating.params).toContain("kitchen");
    expect(rating.params).toContain(100);
  });

  it("builds one facet statement whose arms exclude their own filter", () => {
    const { sql, params } = render(buildFacetStatement(sampleFilters));

    expect(sql).toContain("'category'::text as kind");
    expect(sql).toContain("'category'");
    expect(sql).toContain("'brand'");
    expect(sql).toContain("'price'");
    expect(sql).toContain("'rating'");
    expect(countValue(params, "kitchen")).toBe(3);
    expect(countValue(params, "Acme")).toBe(3);
    expect(countValue(params, "kettle black")).toBe(4);
    expect(countValue(params, 100)).toBe(3);
    expect(countValue(params, 5000)).toBe(3);
    expect(countValue(params, 4)).toBe(3);
  });
});

describe("product sort", () => {
  it("ranks a search by text rank and otherwise by rating", () => {
    const withQuery = renderOrder("relevance", " kettle ");
    expect(withQuery.sql).toContain("ts_rank");
    expect(withQuery.sql).toContain("plainto_tsquery");
    expect(withQuery.params).toContain("kettle");

    const withoutQuery = renderOrder("relevance", "   ");
    expect(withoutQuery.sql).not.toContain("ts_rank");
    expect(withoutQuery.sql.indexOf("rating_average")).toBeLessThan(
      withoutQuery.sql.indexOf("review_count"),
    );
  });

  it("orders each named sort by its column and breaks ties on id", () => {
    const priceAsc = renderOrder("price-asc");
    expect(priceAsc.sql).toContain('"products"."price_in_pence" asc');
    expect(priceAsc.sql).not.toContain("desc");
    expect(priceAsc.sql.endsWith('"products"."id" asc')).toBe(true);

    const priceDesc = renderOrder("price-desc");
    expect(priceDesc.sql).toContain('"products"."price_in_pence" desc');
    expect(priceDesc.sql.endsWith('"products"."id" asc')).toBe(true);

    const rating = renderOrder("rating");
    expect(rating.sql.indexOf("rating_average")).toBeLessThan(rating.sql.indexOf("review_count"));

    const byReviews = renderOrder("reviews");
    expect(byReviews.sql.indexOf("review_count")).toBeLessThan(
      byReviews.sql.indexOf("rating_average"),
    );

    const newest = renderOrder("newest");
    expect(newest.sql).toContain('"products"."created_at" desc');
    expect(newest.sql.endsWith('"products"."id" asc')).toBe(true);
  });

  it("falls back to relevance for an unknown sort", () => {
    expect(resolveProductSort("popular")).toBe("relevance");
    expect(renderOrder("popular").sql).toContain("rating_average");
  });
});

describe("review clauses", () => {
  it("filters to one product and an exact star", () => {
    const exact = render(buildReviewWhere("product-1", 4));
    expect(exact.params).toContain("product-1");
    expect(exact.params).toContain(4);
    expect(exact.sql).toContain('"reviews"."rating" =');

    const ignored = render(buildReviewWhere("product-1", 4.5));
    expect(ignored.params).not.toContain(4.5);
    expect(ignored.sql).not.toContain('"reviews"."rating"');
  });

  it("orders reviews by the named sort and breaks ties on date then id", () => {
    const highest = render(firstClause(buildReviewOrderBy("highest")));
    expect(highest.sql).toContain('"reviews"."rating" desc');

    const lowest = render(firstClause(buildReviewOrderBy("lowest")));
    expect(lowest.sql).toContain('"reviews"."rating" asc');

    const helpful = render(firstClause(buildReviewOrderBy("helpful")));
    expect(helpful.sql).toContain('"reviews"."helpful_count" desc');

    const newest = buildReviewOrderBy("newest").map((clause) => dialect.sqlToQuery(clause).sql);
    expect(newest[0]).toContain('"reviews"."created_at" desc');
    expect(newest[1]).toContain('"reviews"."id" asc');

    const fallback = buildReviewOrderBy("popular").map((clause) => dialect.sqlToQuery(clause).sql);
    expect(fallback[0]).toContain('"reviews"."created_at" desc');
  });
});

describe("suggestions", () => {
  it("ranks typeahead hits with trigram similarity", () => {
    const statement = buildSuggestionSql("  headphones  ");
    if (!statement) {
      throw new Error("Expected a suggestion query.");
    }

    const { sql, params } = render(statement);
    expect(sql.toLowerCase()).toContain("similarity(");
    expect(sql.toLowerCase()).toContain("word_similarity(");
    expect(params).toContain("headphones");
    expect(countValue(params, config.suggestionLimit)).toBeGreaterThanOrEqual(4);
  });

  it("returns nothing for a query shorter than the minimum", () => {
    expect(buildSuggestionSql(" a ")).toBeNull();
    expect(buildSuggestionSql("   ")).toBeNull();
  });
});

describe("pagination", () => {
  it("clamps an invalid page and counts pages from the total", () => {
    expect(pageWindow(0, config.pageSize)).toEqual({ page: 1, limit: 24, offset: 0 });
    expect(pageWindow(2.9, 24)).toEqual({ page: 2, limit: 24, offset: 24 });
    expect(pageWindow(Number.NaN, 24).page).toBe(1);
    expect(pageCount(0, 24)).toBe(0);
    expect(pageCount(25, 24)).toBe(2);
  });
});

describe("home card budget", () => {
  it("locks the caps from config", () => {
    expect(config.homeRailCap).toBe(12);
    expect(config.homeCardBudget).toBe(100);
    expect(config.relatedProductCount).toBe(8);
    expect(config.suggestionLimit).toBe(8);
    expect(config.reviewPageSize).toBe(10);
  });

  it("gives eight departments the configured rail length plus the deals rail", () => {
    expect(allocateHomeRailSizes(8)).toEqual({
      deals: config.homeCards.deals,
      perCategory: config.homeCards.perRail,
      categoryRails: 8,
      totalCards: config.homeCards.deals + config.homeCards.perRail * 8,
    });
  });

  it("stays inside the budget for every department count", () => {
    for (let count = 0; count <= 150; count += 1) {
      const plan = allocateHomeRailSizes(count);
      expect(plan.totalCards).toBeLessThanOrEqual(config.homeCardBudget);
      expect(plan.deals).toBeLessThanOrEqual(config.homeRailCap);
      expect(plan.perCategory).toBeLessThanOrEqual(config.homeRailCap);
      expect(plan.categoryRails).toBeLessThanOrEqual(count);
      expect(plan.totalCards).toBe(plan.deals + plan.perCategory * plan.categoryRails);
    }

    expect(allocateHomeRailSizes(0)).toEqual({
      deals: 12,
      perCategory: 0,
      categoryRails: 0,
      totalCards: 12,
    });
  });

  it("trims an oversized payload back to the budget and the rail cap", () => {
    const plan = allocateHomeRailSizes(8);
    const legalDeals = Array.from({ length: plan.deals }, (_, index) => index);
    const legalRails = Array.from({ length: plan.categoryRails }, () =>
      Array.from({ length: plan.perCategory }, (_, index) => index),
    );
    const legal = capHomeRails(legalDeals, legalRails);
    expect(legal.deals).toHaveLength(plan.deals);
    expect(legal.rails.map((rail) => rail.length)).toEqual(legalRails.map((rail) => rail.length));

    const overflow = capHomeRails(
      Array.from({ length: 50 }, (_, index) => index),
      Array.from({ length: 10 }, () => Array.from({ length: 40 }, (_, index) => index)),
    );
    const total =
      overflow.deals.length + overflow.rails.reduce((sum, rail) => sum + rail.length, 0);
    expect(total).toBeLessThanOrEqual(config.homeCardBudget);
    expect(overflow.deals.length).toBeLessThanOrEqual(config.homeRailCap);
    expect(overflow.rails.every((rail) => rail.length <= config.homeRailCap)).toBe(true);
  });

  it("reserves recently viewed inside the same 100 card budget", () => {
    expect(displayedHomeLimits(8, config.recentlyViewedCap)).toEqual({
      deals: config.homeCards.deals,
      perCategory: config.homeCards.perRail,
      categoryRails: 8,
      recentlyViewed: config.homeCards.recentlyViewed,
      totalCards:
        config.homeCards.deals +
        config.homeCards.perRail * 8 +
        config.homeCards.recentlyViewed,
    });

    for (let count = 0; count <= 20; count += 1) {
      expect(displayedHomeLimits(count, config.recentlyViewedCap).totalCards).toBeLessThanOrEqual(
        config.homeCardBudget,
      );
    }
  });

  it("clamps a requested rail length", () => {
    expect(clampRailLimit(100)).toBe(12);
    expect(clampRailLimit(11.9)).toBe(11);
    expect(clampRailLimit(0)).toBe(0);
    expect(clampRailLimit(-4)).toBe(0);
  });
});
