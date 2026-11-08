import { ProductRail } from "@/components/product/product-rail";
import { getCategoryRail } from "@/lib/queries/products";
import { getRecentlyViewed } from "@/lib/queries/view-history";
import { readViewOwner } from "@/lib/view-owner";

export async function RecentlyViewedRail({ limit }: { limit: number }) {
  const owner = await readViewOwner();
  if (!owner) return null;

  const products = await getRecentlyViewed(owner, limit);
  if (products.length === 0) return null;

  return <ProductRail title="Recently viewed" products={products} />;
}

export async function HomeCategoryRail({
  slug,
  name,
  limit,
}: {
  slug: string;
  name: string;
  limit: number;
}) {
  const products = await getCategoryRail({ slug, limit });
  if (products.length === 0) return null;

  return <ProductRail title={name} href={`/c/${slug}`} products={products} />;
}
