import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import {
  catalogueHref,
  toggleBrand,
  type CatalogueFilters,
} from "@/lib/catalogue";
import { config } from "@/lib/config";
import { withSearchQuery } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export type FilterModel = {
  pathname: string;
  filters: CatalogueFilters;
  brands: { name: string; count: number }[];
  ratings: { minRating: number; count: number }[];
  departments: { href: string; name: string; count: number | null; current: boolean }[];
  parent: { href: string; label: string } | null;
  query?: string;
};

function optionClass(active: boolean) {
  return cn(
    "flex min-h-10 items-center gap-2 rounded-lg px-2 text-small",
    focusRingClass,
    active ? "bg-secondary font-medium text-foreground" : "hover:bg-muted",
  );
}

export function FilterGroups({ model }: { model: FilterModel }) {
  const { pathname, filters } = model;
  const hrefFor = (patch: Parameters<typeof catalogueHref>[2]) =>
    withSearchQuery(catalogueHref(pathname, filters, patch), model.query);
  const shownBrands = model.brands.slice(0, 12);
  const selectedMissing = filters.brands.filter(
    (brand) => !shownBrands.some((entry) => entry.name === brand),
  );

  return (
    <div className="flex flex-col gap-6">
      {model.departments.length > 0 || model.parent ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-h3">In this department</h3>
          <ul className="flex flex-col">
            {model.parent ? (
              <li>
                <Link href={model.parent.href} className={optionClass(false)}>
                  {model.parent.label}
                </Link>
              </li>
            ) : null}
            {model.departments.map((department) => (
              <li key={department.href}>
                <Link
                  href={department.href}
                  aria-current={department.current ? "page" : undefined}
                  className={optionClass(department.current)}
                >
                  <span className="min-w-0 flex-1">{department.name}</span>
                  {department.count !== null ? (
                    <span className="tnum text-muted-foreground">{department.count}</span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-h3">Price</h3>
        <ul className="flex flex-col">
          {config.priceBands.map((band) => {
            const active = filters.minPrice === band.minPrice && filters.maxPrice === band.maxPrice;
            const href = hrefFor(
              active
                ? { minPrice: null, maxPrice: null, page: 1 }
                : { minPrice: band.minPrice, maxPrice: band.maxPrice, page: 1 },
            );
            return (
              <li key={band.label}>
                <Link href={href} aria-current={active ? "true" : undefined} className={optionClass(active)}>
                  {band.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {shownBrands.length > 0 || selectedMissing.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="text-h3">Brand</h3>
          <ul className="flex flex-col">
            {shownBrands.map((brand) => {
              const active = filters.brands.includes(brand.name);
              const href = hrefFor({
                brands: toggleBrand(filters, brand.name),
                page: 1,
              });
              return (
                <li key={brand.name}>
                  <Link href={href} aria-current={active ? "true" : undefined} className={optionClass(active)}>
                    <span className="min-w-0 flex-1">{brand.name}</span>
                    <span className="tnum text-muted-foreground">{brand.count}</span>
                  </Link>
                </li>
              );
            })}
            {selectedMissing.map((brand) => {
              const href = hrefFor({
                brands: toggleBrand(filters, brand),
                page: 1,
              });
              return (
                <li key={brand}>
                  <Link href={href} aria-current="true" className={optionClass(true)}>
                    {brand}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="flex flex-col gap-2">
        <h3 className="text-h3">Customer rating</h3>
        <ul className="flex flex-col">
          {model.ratings.map((rating) => {
            const active = filters.minRating === rating.minRating;
            const label = rating.minRating === 1 ? "1 star and up" : `${rating.minRating} stars and up`;
            const href = hrefFor(active ? { minRating: null, page: 1 } : { minRating: rating.minRating, page: 1 });
            return (
              <li key={rating.minRating}>
                <Link
                  href={href}
                  aria-current={active ? "true" : undefined}
                  aria-label={`${label}, ${rating.count}`}
                  className={optionClass(active)}
                >
                  <span className="min-w-0 flex-1">{label}</span>
                  <span className="tnum text-muted-foreground">{rating.count}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-h3">Availability</h3>
        <Link
          href={hrefFor({ inStock: !filters.inStock, page: 1 })}
          aria-current={filters.inStock ? "true" : undefined}
          className={optionClass(filters.inStock)}
        >
          In stock
        </Link>
      </section>
    </div>
  );
}
