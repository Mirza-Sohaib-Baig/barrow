import { ProductGridSkeleton } from "@/components/product/product-grid";
import { Skeleton } from "@/components/ui/skeleton";

export function CategoryBrowseSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-hidden="true">
      <Skeleton className="h-4 w-40" />
      <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
        <div className="hidden lg:flex lg:flex-col lg:gap-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="flex flex-col gap-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-full max-w-xs lg:hidden" />
          <ProductGridSkeleton />
        </div>
      </div>
    </div>
  );
}
