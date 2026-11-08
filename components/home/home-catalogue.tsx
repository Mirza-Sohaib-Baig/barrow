import { Suspense } from "react";
import { CategoryTiles, type CategoryTile } from "@/components/home/category-tiles";
import { HomeCategoryRail, RecentlyViewedRail } from "@/components/home/home-rails";
import { ProductRail, ProductRailSkeleton } from "@/components/product/product-rail";
import { config } from "@/lib/config";
import { displayedHomeLimits } from "@/lib/queries/home-budget";
import { getDealsRail, getHomeCategories } from "@/lib/queries/products";

export async function HomeCatalogue() {
  const rows = await getHomeCategories();
  const catalogueTiles = rows.slice(0, config.homeCards.tiles);
  const tiles: (CategoryTile & { inCatalogue: boolean })[] =
    catalogueTiles.length > 0
      ? catalogueTiles.map((tile) => ({
          slug: tile.slug,
          name: tile.name,
          imageUrl: tile.imageUrl,
          inCatalogue: true,
        }))
      : config.departments.map((department) => ({
          slug: department.slug,
          name: department.label,
          imageUrl: null,
          inCatalogue: false,
        }));

  const limits = displayedHomeLimits(
    tiles.filter((tile) => tile.inCatalogue).length,
    config.recentlyViewedCap,
  );
  const deals = await getDealsRail({ limit: limits.deals });

  return (
    <>
      <CategoryTiles tiles={tiles} />
      <ProductRail id="todays-deals" title="Today's deals" products={deals} />
      <Suspense fallback={<ProductRailSkeleton title="Recently viewed" count={2} />}>
        <RecentlyViewedRail limit={limits.recentlyViewed} />
      </Suspense>
      {tiles
        .filter((tile) => tile.inCatalogue && limits.perCategory > 0)
        .map((tile) => (
          <Suspense key={tile.slug} fallback={<ProductRailSkeleton title={tile.name} />}>
            <HomeCategoryRail slug={tile.slug} name={tile.name} limit={limits.perCategory} />
          </Suspense>
        ))}
    </>
  );
}
