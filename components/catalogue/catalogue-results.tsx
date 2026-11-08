import { FilterGroups, type FilterModel } from "@/components/catalogue/filter-groups";
import { FilterSheet } from "@/components/catalogue/filter-sheet";
import { Pagination } from "@/components/catalogue/pagination";
import { ResultsGrid } from "@/components/catalogue/results-grid";
import { SortControl } from "@/components/catalogue/sort-control";
import type { EmptyCopy } from "@/lib/catalogue";
import type { ProductCard as ProductCardData } from "@/lib/product-card";

export function CatalogueResults({
  heading,
  model,
  products,
  empty,
  page,
  pageCount,
}: {
  heading: { title: string; countLabel: string };
  model: FilterModel;
  products: ProductCardData[];
  empty: EmptyCopy;
  page: number;
  pageCount: number;
}) {
  return (
    <div className="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:items-start lg:gap-8">
      <aside className="hidden lg:block">
        <h2 className="mb-4 text-h3">Filters</h2>
        <FilterGroups model={model} />
      </aside>
      <div className="flex min-w-0 flex-col gap-6">
        <div className="flex flex-col gap-4">
          <h1 className="text-h1">
            {heading.title}
            <span className="mt-2 block text-small font-normal text-muted-foreground">
              <span className="tnum">{heading.countLabel}</span>
            </span>
          </h1>
          <div className="flex flex-col gap-3">
            <FilterSheet>
              <FilterGroups model={model} />
            </FilterSheet>
            <SortControl pathname={model.pathname} filters={model.filters} />
          </div>
        </div>
        <ResultsGrid products={products} empty={empty} />
        <Pagination
          pathname={model.pathname}
          filters={model.filters}
          page={page}
          pageCount={pageCount}
        />
      </div>
    </div>
  );
}
