import type { Metadata } from "next";
import Link from "next/link";
import { productGridClass, textLinkClass } from "@/components/product/metrics";
import { Price } from "@/components/product/price";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";
import { ProductGrid, ProductGridSkeleton } from "@/components/product/product-grid";
import { ProductRail, ProductRailSkeleton } from "@/components/product/product-rail";
import { StarRating } from "@/components/product/star-rating";
import { ThemeToggle } from "@/components/shell/theme-toggle";
import type { ProductCard as ProductCardData } from "@/lib/product-card";

export const metadata: Metadata = {
  title: "Components",
  robots: { index: false, follow: false },
};

function sample(
  id: string,
  patch: Partial<ProductCardData> & Pick<ProductCardData, "title">,
): ProductCardData {
  return {
    id,
    slug: id,
    image: "/dev/product.png",
    priceInPence: 2400,
    listPriceInPence: 4000,
    ratingAverage: 4.5,
    reviewCount: 128,
    stock: 18,
    ...patch,
  };
}

const verified = sample("wool-throw", { title: "Wool throw in oat" });
const lowStock = sample("linen-napkins", {
  title: "Linen napkins, set of four",
  priceInPence: 1800,
  listPriceInPence: null,
  stock: 2,
  ratingAverage: 4.2,
  reviewCount: 36,
});
const outOfStock = sample("oak-stool", {
  title: "Oak stool",
  priceInPence: 8900,
  listPriceInPence: 9900,
  stock: 0,
  ratingAverage: 4.8,
  reviewCount: 54,
});
const noListPrice = sample("ceramic-mug", {
  title: "Ceramic mug",
  priceInPence: 1400,
  listPriceInPence: null,
  ratingAverage: 4,
  reviewCount: 12,
});
const longTitle = sample("stoneware-jug", {
  title:
    "Hand thrown stoneware pour-over jug with a walnut lid and a cotton storage sack for the cupboard",
  priceInPence: 4200,
  listPriceInPence: 4800,
  ratingAverage: 3.5,
  reviewCount: 9,
});
const zeroReviews = sample("brass-hook", {
  title: "Brass hook",
  priceInPence: 900,
  listPriceInPence: null,
  ratingAverage: 0,
  reviewCount: 0,
  stock: 6,
});
const missingImage = sample("glass-carafe", {
  title: "Glass carafe",
  image: null,
  priceInPence: 2600,
  listPriceInPence: 3200,
  ratingAverage: 4.6,
  reviewCount: 21,
});
const saved = sample("cotton-robe", {
  title: "Cotton robe",
  priceInPence: 6500,
  listPriceInPence: 6500,
  ratingAverage: 5,
  reviewCount: 7,
});

const cards: { label: string; product: ProductCardData; saved?: boolean }[] = [
  { label: "Verified saving", product: verified },
  { label: "Low stock", product: lowStock },
  { label: "Out of stock", product: outOfStock },
  { label: "No list price", product: noListPrice },
  { label: "Long title", product: longTitle },
  { label: "Zero reviews", product: zeroReviews },
  { label: "Missing image", product: missingImage },
  { label: "Wishlist saved", product: saved, saved: true },
];

const railProducts = [
  verified,
  lowStock,
  noListPrice,
  longTitle,
  zeroReviews,
  missingImage,
  saved,
  outOfStock,
];

const ratings: { rating: number; count?: number; label: string }[] = [
  { rating: 0, count: 0, label: "Zero reviews" },
  { rating: 0.5, count: 1, label: "Half star" },
  { rating: 2.5, count: 8, label: "Two and a half" },
  { rating: 4.2, count: 128, label: "Nearest half" },
  { rating: 5, count: 40, label: "Full marks" },
];

export default function ComponentsPage() {
  return (
    <main className="mx-auto flex w-full max-w-[1280px] flex-col gap-12 px-4 py-8 md:px-6 md:py-12 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-3">
          <h1 className="text-h1">Components</h1>
          <p className="max-w-2xl text-body text-muted-foreground">
            Product card, price, stars, grid and rail, including the empty and loading states.
          </p>
          <Link href="/" className={textLinkClass}>
            Back to the shop
          </Link>
        </div>
        <ThemeToggle />
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Cards</h2>
        <ul className={productGridClass}>
          {cards.map((item) => (
            <li key={item.product.id} className="flex min-w-0 flex-col gap-2">
              <p className="text-small text-muted-foreground">{item.label}</p>
              <ProductCard product={item.product} saved={item.saved} />
            </li>
          ))}
          <li className="flex min-w-0 flex-col gap-2">
            <p className="text-small text-muted-foreground">Loading</p>
            <ProductCardSkeleton />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Star rating</h2>
        <ul className="flex flex-col gap-3">
          {ratings.map((item) => (
            <li key={item.label} className="flex flex-wrap items-center gap-3">
              <StarRating rating={item.rating} count={item.count} />
              <span className="text-small text-muted-foreground">{item.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Price</h2>
        <ul className="flex flex-col gap-4">
          <li className="flex flex-col gap-1">
            <p className="text-small text-muted-foreground">Card size, verified saving</p>
            <Price priceInPence={2400} listPriceInPence={4000} size="h3" savings />
          </li>
          <li className="flex flex-col gap-1">
            <p className="text-small text-muted-foreground">Body size</p>
            <Price priceInPence={2400} listPriceInPence={4000} size="body" savings />
          </li>
          <li className="flex flex-col gap-1">
            <p className="text-small text-muted-foreground">Small size</p>
            <Price priceInPence={2400} listPriceInPence={4000} size="small" savings />
          </li>
          <li className="flex flex-col gap-1">
            <p className="text-small text-muted-foreground">No list price</p>
            <Price priceInPence={1400} size="h3" />
          </li>
          <li className="flex flex-col gap-1">
            <p className="text-small text-muted-foreground">List price suppressed</p>
            <Price priceInPence={2400} listPriceInPence={4000} size="h3" savings={false} />
          </li>
          <li className="flex flex-col gap-1">
            <p className="text-small text-muted-foreground">List price is not a saving</p>
            <Price priceInPence={2400} listPriceInPence={2400} size="h3" savings />
          </li>
        </ul>
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Grid</h2>
        <ProductGrid products={railProducts} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Empty grid</h2>
        <ProductGrid products={[]} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Grid error</h2>
        <ProductGrid products={[]} error="The product list could not be loaded." />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-h2">Loading grid</h2>
        <ProductGridSkeleton count={4} />
      </section>

      <ProductRail title="In the rail" products={railProducts} />

      <ProductRail title="Empty rail" products={[]} />

      <ProductRailSkeleton title="Loading rail" count={4} />

      <p className="text-small text-muted-foreground">
        Focus a rail and use the arrow keys. On a wide screen, the buttons scroll one card at a
        time.
      </p>
    </main>
  );
}
