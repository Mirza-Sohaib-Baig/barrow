import Link from "next/link";
import type { ReactNode } from "react";
import { focusRingClass } from "@/components/product/metrics";
import { productHref, type ProductQuery, type ProductTab } from "@/components/product/product-params";
import { cn } from "@/lib/utils";

const tabLabels: { tab: ProductTab; label: string }[] = [
  { tab: "overview", label: "Overview" },
  { tab: "specs", label: "Specs" },
  { tab: "reviews", label: "Reviews" },
];

function Overview({ bullets, description }: { bullets: string[]; description: string }) {
  const text = description.trim();
  if (bullets.length === 0 && text.length === 0) {
    return <p className="text-body text-muted-foreground">No description for this product.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      {bullets.length > 0 ? (
        <ul className="list-disc space-y-2 pl-5 text-body">
          {bullets.map((bullet, index) => (
            <li key={`${bullet}-${index}`}>{bullet}</li>
          ))}
        </ul>
      ) : null}
      {text.length > 0 ? <p className="text-body whitespace-pre-line">{text}</p> : null}
    </div>
  );
}

function Specs({ specs }: { specs: Record<string, string> }) {
  const entries = Object.entries(specs);
  if (entries.length === 0) {
    return <p className="text-body text-muted-foreground">No specifications for this product.</p>;
  }

  return (
    <dl className="divide-y divide-border">
      {entries.map(([term, value]) => (
        <div key={term} className="grid gap-1 py-3 sm:grid-cols-[12rem_minmax(0,1fr)] sm:gap-4">
          <dt className="text-small text-muted-foreground">{term}</dt>
          <dd className="text-body break-words">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ProductTabs({
  slug,
  query,
  bullets,
  description,
  specs,
  reviews,
}: {
  slug: string;
  query: ProductQuery;
  bullets: string[];
  description: string;
  specs: Record<string, string>;
  reviews: ReactNode;
}) {
  return (
    <section className="flex min-w-0 flex-col gap-4">
      <nav aria-label="Product information" className="flex gap-1 overflow-x-auto border-b border-border">
        {tabLabels.map((item) => {
          const active = query.tab === item.tab;
          return (
            <Link
              key={item.tab}
              href={productHref(slug, query, { tab: item.tab })}
              aria-current={active ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center border-b-2 px-3 text-small",
                focusRingClass,
                active
                  ? "border-foreground font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {query.tab === "specs" ? <Specs specs={specs} /> : null}
      {query.tab === "reviews" ? reviews : null}
      {query.tab === "overview" ? <Overview bullets={bullets} description={description} /> : null}
    </section>
  );
}
