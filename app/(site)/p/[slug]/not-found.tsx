import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function ProductNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">Product not found</h1>
      <p className="max-w-xl text-body text-muted-foreground">
        It may have left the catalogue, or the link may be out of date.
      </p>
      <Link href="/" className={cn("w-fit text-body underline underline-offset-4", focusRingClass)}>
        Search the shop
      </Link>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {config.departments.map((department) => (
          <li key={department.slug}>
            <Link
              href={`/c/${department.slug}`}
              className={cn(
                "flex min-h-16 items-center rounded-lg border border-border bg-card p-4 text-h3",
                focusRingClass,
              )}
            >
              {department.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
