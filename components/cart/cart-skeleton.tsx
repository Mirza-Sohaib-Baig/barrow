import { Skeleton } from "@/components/ui/skeleton";

function LineSkeleton() {
  return (
    <div className="flex gap-4 py-4">
      <Skeleton className="size-24 shrink-0 rounded-lg" />
      <div className="flex flex-1 flex-col gap-3">
        <Skeleton className="h-6 w-3/4" />
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-10 w-40" />
      </div>
    </div>
  );
}

export function CartSkeleton() {
  return (
    <div aria-busy="true">
      <span className="sr-only">Loading your cart</span>
      <div aria-hidden="true" className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div className="flex flex-col">
          <Skeleton className="h-10 w-48" />
          <LineSkeleton />
          <LineSkeleton />
        </div>
        <Skeleton className="h-64 w-full rounded-lg" />
      </div>
    </div>
  );
}
