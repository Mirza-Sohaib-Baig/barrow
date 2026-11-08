import { desc, eq, sql } from "drizzle-orm";
import { products, viewHistory } from "@/drizzle/schema";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import type { ProductCard } from "@/lib/queries/products";
import type { ViewOwner } from "@/lib/view-owner";

function ownerWhere(owner: ViewOwner) {
  if ("userId" in owner) return eq(viewHistory.userId, owner.userId);
  return eq(viewHistory.sessionKey, owner.sessionKey);
}

export async function getRecentlyViewed(owner: ViewOwner, limit: number): Promise<ProductCard[]> {
  const size = Math.min(
    config.recentlyViewedCap,
    Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 0,
  );
  if (size === 0) return [];

  const rows = await db
    .select({
      id: products.id,
      slug: products.slug,
      title: products.title,
      image: sql<string | null>`${products.imageUrls}->>0`,
      priceInPence: products.priceInPence,
      listPriceInPence: products.listPriceInPence,
      ratingAverage: products.ratingAverage,
      reviewCount: products.reviewCount,
      stock: products.stock,
    })
    .from(viewHistory)
    .innerJoin(products, eq(products.id, viewHistory.productId))
    .where(ownerWhere(owner))
    .orderBy(desc(viewHistory.viewedAt))
    .limit(size * 5);

  const seen = new Set<string>();
  const cards: ProductCard[] = [];
  for (const row of rows) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    cards.push({
      id: row.id,
      slug: row.slug,
      title: row.title,
      image: row.image ? row.image : null,
      priceInPence: row.priceInPence,
      listPriceInPence: row.listPriceInPence,
      ratingAverage: row.ratingAverage,
      reviewCount: row.reviewCount,
      stock: row.stock,
    });
    if (cards.length === size) break;
  }
  return cards;
}
