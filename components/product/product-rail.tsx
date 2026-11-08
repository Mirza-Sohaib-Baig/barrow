import Link from "next/link";
import { useId } from "react";
import { productRailCardClass, productRailImageSizes, textLinkClass } from "@/components/product/metrics";
import { cn } from "@/lib/utils";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";
import { ProductRailScroll } from "@/components/product/product-rail-scroll";
import type { ProductCard as ProductCardData } from "@/lib/product-card";

export function ProductRail({
  title,
  products,
  href,
  id,
}: {
  title: string;
  products: ProductCardData[];
  href?: string;
  id?: string;
}) {
  const titleId = useId();

  return (
    <section
      id={id}
      aria-labelledby={titleId}
      className={cn("flex flex-col gap-4", id ? "scroll-mt-8" : undefined)}
    >
      <div className="flex items-baseline justify-between gap-4">
        <h2 id={titleId} className="text-h2">
          {title}
        </h2>
        {href ? (
          <Link href={href} className={cn(textLinkClass, "shrink-0 text-small")}>
            See all
          </Link>
        ) : null}
      </div>
      {products.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4">
          <p className="text-body text-muted-foreground">
            Nothing in this rail yet. Browse the shop while it is filled.
          </p>
          <Link href="/" className={textLinkClass}>
            Browse home
          </Link>
        </div>
      ) : (
        <ProductRailScroll labelledBy={titleId}>
          {products.map((product) => (
            <div key={product.id} data-rail-card className={productRailCardClass}>
              <ProductCard product={product} sizes={productRailImageSizes} />
            </div>
          ))}
        </ProductRailScroll>
      )}
    </section>
  );
}

export function ProductRailSkeleton({ title, count = 6 }: { title: string; count?: number }) {
  const titleId = useId();

  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-4">
      <h2 id={titleId} className="text-h2">
        {title}
      </h2>
      <div className="flex gap-4 overflow-hidden" aria-hidden="true">
        {Array.from({ length: count }, (_, index) => (
          <div key={index} className={productRailCardClass}>
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    </section>
  );
}
