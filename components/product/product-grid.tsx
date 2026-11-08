import Link from "next/link";
import { ProductCard } from "@/components/product/product-card";
import { ProductCardSkeleton } from "@/components/product/product-card-skeleton";
import { productGridClass, textLinkClass } from "@/components/product/metrics";
import { RetryButton } from "@/components/product/retry-button";
import type { ProductCard as ProductCardData } from "@/lib/product-card";

export function ProductGrid({
  products,
  error,
}: {
  products: ProductCardData[];
  error?: string;
}) {
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4"
      >
        <p className="text-h3">Could not load products</p>
        <p className="text-body text-muted-foreground">{error}</p>
        <RetryButton />
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-lg border border-border bg-card p-4">
        <p className="text-h3">No products to show</p>
        <p className="text-body text-muted-foreground">
          Nothing matched this view. Try another department.
        </p>
        <Link href="/" className={textLinkClass}>
          Browse home
        </Link>
      </div>
    );
  }

  return (
    <ul className={productGridClass}>
      {products.map((product) => (
        <li key={product.id} className="min-w-0">
          <ProductCard product={product} />
        </li>
      ))}
    </ul>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <ul className={productGridClass} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index}>
          <ProductCardSkeleton />
        </li>
      ))}
    </ul>
  );
}
