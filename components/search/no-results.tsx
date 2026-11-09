import Link from "next/link";
import { ProductRail } from "@/components/product/product-rail";
import { focusRingClass } from "@/components/product/metrics";
import type { ProductCard } from "@/lib/product-card";
import { cn } from "@/lib/utils";

export function SearchNoResults({
  query,
  alternatives,
  rails,
}: {
  query: string;
  alternatives: string[];
  rails: { title: string; href: string; products: ProductCard[] }[];
}) {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <h1 className="text-h1">No results for {query}</h1>
        <p className="text-body text-muted-foreground">Try a different search, or browse a department.</p>
      </div>
      {alternatives.length > 0 ? (
        <div className="flex flex-col gap-3">
          <h2 className="text-h2">Similar searches</h2>
          <ul className="flex flex-col gap-2">
            {alternatives.map((alternative) => (
              <li key={alternative}>
                <Link
                  href={`/search?q=${encodeURIComponent(alternative)}`}
                  className={cn("text-body underline-offset-2 hover:underline", focusRingClass)}
                >
                  {alternative}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {rails.map((rail) => (
        <ProductRail key={rail.title} title={rail.title} href={rail.href} products={rail.products} />
      ))}
      {alternatives.length === 0 && rails.length === 0 ? (
        <Link href="/" className={cn("text-body underline-offset-2 hover:underline", focusRingClass)}>
          Back to the shop
        </Link>
      ) : null}
    </div>
  );
}
