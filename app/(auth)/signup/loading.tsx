import { Skeleton } from "@/components/ui/skeleton";

export default function SignUpLoading() {
  return (
    <div className="flex flex-col gap-8" aria-busy="true" aria-label="Loading create account">
      <Skeleton className="h-7 w-32" />
      <Skeleton className="h-9 w-56" />
      <div className="flex flex-col gap-6">
        {["name", "email", "password", "confirm"].map((field) => (
          <div key={field} className="flex flex-col gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
        <Skeleton className="h-10 w-full" />
      </div>
    </div>
  );
}
