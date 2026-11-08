import { ProductRailSkeleton } from "@/components/product/product-rail";
import { Skeleton } from "@/components/ui/skeleton";

export function HomeSkeleton() {
  return (
    <div className="flex flex-col gap-12" aria-hidden="true">
      <div className="flex max-w-xl flex-col items-start gap-6">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-40" />
      </div>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 8 }, (_, index) => (
          <li key={index} className="overflow-hidden rounded-lg border border-border">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="p-4">
              <Skeleton className="h-[1.4625rem] w-24" />
            </div>
          </li>
        ))}
      </ul>
      <ProductRailSkeleton title="Today's deals" />
    </div>
  );
}
