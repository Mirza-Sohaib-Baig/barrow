import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import { config } from "@/lib/config";
import { cn } from "@/lib/utils";

export default function CategoryNotFound() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-h1">That department isn&apos;t in the shop</h1>
      <p className="max-w-xl text-body text-muted-foreground">Choose one of the departments below.</p>
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
