import Link from "next/link";
import { ProductGrid } from "@/components/product/product-grid";
import { Button } from "@/components/ui/button";
import type { EmptyCopy } from "@/lib/catalogue";
import type { ProductCard as ProductCardData } from "@/lib/product-card";

export function ResultsGrid({
  products,
  empty,
}: {
  products: ProductCardData[];
  empty: EmptyCopy;
}) {
  if (products.length === 0) {
    return (
      <div className="flex flex-col items-start gap-4 rounded-lg border border-border bg-card p-4">
        <p className="max-w-xl text-body">{empty.text}</p>
        <Button
          variant="outline"
          className="h-10 px-4"
          nativeButton={false}
          render={<Link href={empty.href} />}
        >
          {empty.action}
        </Button>
      </div>
    );
  }

  return <ProductGrid products={products} />;
}
