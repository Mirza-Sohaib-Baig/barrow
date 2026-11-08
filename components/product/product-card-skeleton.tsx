import { Skeleton } from "@/components/ui/skeleton";
import {
  productCardActionClass,
  productCardBodyClass,
  productCardFrameClass,
  productCardImageClass,
  productCardPriceClass,
  productCardRatingClass,
  productCardStockClass,
  productCardTitleClass,
} from "@/components/product/metrics";

export function ProductCardSkeleton() {
  return (
    <div className={productCardFrameClass} aria-hidden="true">
      <div className={productCardImageClass}>
        <Skeleton className="absolute inset-0 h-full w-full rounded-none" />
      </div>
      <div className={productCardBodyClass}>
        <Skeleton className={`${productCardTitleClass} w-full`} />
        <Skeleton className={`${productCardRatingClass} w-2/3`} />
        <Skeleton className={`${productCardPriceClass} w-4/5`} />
        <Skeleton className={`${productCardStockClass} w-1/3`} />
      </div>
      <div className={productCardActionClass}>
        <Skeleton className="h-10 w-full" />
      </div>
      <Skeleton className="absolute top-2 right-2 size-10 rounded-lg" />
    </div>
  );
}
