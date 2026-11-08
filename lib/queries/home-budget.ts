import { config } from "@/lib/config";

export type HomeRailPlan = {
  deals: number;
  perCategory: number;
  categoryRails: number;
  totalCards: number;
};

// Deals stay at the configured length. What remains of the card budget is split
// across the top categories, and no rail may exceed the configured rail length.
export function allocateHomeRailSizes(topCategoryCount: number): HomeRailPlan {
  const deals = Math.min(config.homeCards.deals, config.homeRailCap, config.homeCardBudget);
  const remaining = config.homeCardBudget - deals;
  const railCap = Math.min(config.homeCards.perRail, config.homeRailCap);

  if (!Number.isFinite(topCategoryCount) || topCategoryCount <= 0 || remaining <= 0 || railCap <= 0) {
    return { deals, perCategory: 0, categoryRails: 0, totalCards: deals };
  }

  const count = Math.floor(topCategoryCount);
  const even = Math.floor(remaining / count);
  const perCategory = Math.min(railCap, even);

  if (perCategory < 1) {
    const categoryRails = Math.min(count, remaining);
    return {
      deals,
      perCategory: categoryRails === 0 ? 0 : 1,
      categoryRails,
      totalCards: deals + categoryRails,
    };
  }

  return {
    deals,
    perCategory,
    categoryRails: count,
    totalCards: deals + perCategory * count,
  };
}

export function displayedHomeLimits(
  topCategoryCount: number,
  recentReserve: number,
): HomeRailPlan & { recentlyViewed: number } {
  const plan = allocateHomeRailSizes(topCategoryCount);
  const recentCap = Math.min(config.homeCards.recentlyViewed, config.recentlyViewedCap);
  let recentlyViewed = Number.isFinite(recentReserve) ? Math.max(0, Math.floor(recentReserve)) : 0;
  recentlyViewed = Math.min(recentlyViewed, recentCap);
  let perCategory = plan.perCategory;

  const catalogueCards = () => plan.deals + perCategory * plan.categoryRails;

  while (catalogueCards() + recentlyViewed > config.homeCardBudget && perCategory > 0) {
    perCategory -= 1;
  }
  while (catalogueCards() + recentlyViewed > config.homeCardBudget && recentlyViewed > 0) {
    recentlyViewed -= 1;
  }

  return {
    deals: plan.deals,
    perCategory,
    categoryRails: plan.categoryRails,
    recentlyViewed,
    totalCards: catalogueCards() + recentlyViewed,
  };
}

export function clampRailLimit(limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return 0;
  return Math.min(config.homeRailCap, Math.floor(limit));
}

export function capHomeRails<T>(deals: readonly T[], rails: readonly (readonly T[])[]): {
  deals: T[];
  rails: T[][];
} {
  let remaining = config.homeCardBudget;
  const cappedDeals = deals.slice(0, Math.min(config.homeRailCap, remaining));
  remaining -= cappedDeals.length;

  const cappedRails = rails.map((rail) => {
    const items = rail.slice(0, Math.min(config.homeRailCap, Math.max(remaining, 0)));
    remaining -= items.length;
    return items;
  });

  return { deals: cappedDeals, rails: cappedRails };
}
