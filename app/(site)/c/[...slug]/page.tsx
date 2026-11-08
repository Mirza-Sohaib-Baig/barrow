import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Fragment, Suspense } from "react";
import { CategoryBrowseSkeleton } from "@/components/catalogue/browse-skeleton";
import { CatalogueResults } from "@/components/catalogue/catalogue-results";
import type { FilterModel } from "@/components/catalogue/filter-groups";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  catalogueHref,
  emptyCatalogueCopy,
  likelyCulprit,
  parseCatalogueFilters,
  productCountLabel,
  toProductCardOptions,
  type CatalogueFilters,
  type SearchRecord,
} from "@/lib/catalogue";
import {
  categoryBySlug,
  categoryChain,
  categoryHref,
  resolveCategoryPath,
  type CategoryRecord,
  type ResolvedCategory,
} from "@/lib/categories";
import { config } from "@/lib/config";
import { getCategoryIndex } from "@/lib/queries/categories";
import { getFacets, getProductCards, type Facets } from "@/lib/queries/products";

type PageProps = {
  params: Promise<{ slug: string[] }>;
  searchParams: Promise<SearchRecord>;
};

function departmentHref(path: { slug: string }[], filters: CatalogueFilters): string {
  return catalogueHref(categoryHref(path), filters, { page: 1 });
}

function filterModel(
  pathname: string,
  filters: CatalogueFilters,
  resolved: ResolvedCategory | null,
  facets: Facets,
): FilterModel {
  const counts = new Map(facets.categories.map((category) => [category.slug, category.count]));
  if (!resolved) {
    return {
      pathname,
      filters,
      brands: facets.brands,
      ratings: facets.ratings,
      departments: [],
      parent: null,
    };
  }

  const branch =
    resolved.children.length > 0
      ? resolved.children
      : resolved.peers.length > 1
        ? resolved.peers
        : [];
  const prefix = resolved.children.length > 0 ? [...resolved.ancestors, resolved.category] : resolved.ancestors;
  const parent = resolved.ancestors.at(-1);

  return {
    pathname,
    filters,
    brands: facets.brands,
    ratings: facets.ratings,
    departments: branch.map((category) => ({
      name: category.name,
      href: departmentHref([...prefix, category], filters),
      count: counts.get(category.slug) ?? 0,
      current: category.id === resolved.category.id,
    })),
    parent: parent
      ? { href: departmentHref(resolved.ancestors, filters), label: `All ${parent.name}` }
      : null,
  };
}

function CategoryCrumbs({
  ancestors,
  name,
}: {
  ancestors: CategoryRecord[];
  name: string;
}) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink render={<Link href="/" />}>Shop</BreadcrumbLink>
        </BreadcrumbItem>
        {ancestors.map((crumb, index) => (
          <Fragment key={crumb.id}>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink render={<Link href={categoryHref(ancestors.slice(0, index + 1))} />}>
                {crumb.name}
              </BreadcrumbLink>
            </BreadcrumbItem>
          </Fragment>
        ))}
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>{name}</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}

async function CategoryBrowse({ params, searchParams }: PageProps) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const filters = parseCatalogueFilters(raw);
  const index = await getCategoryIndex();
  const resolved = resolveCategoryPath(index, slug);

  if (!resolved) {
    const leaf = categoryBySlug(index, slug.at(-1) ?? "");
    const chain = leaf ? categoryChain(index, leaf.id) : null;
    if (chain && chain.map((category) => category.slug).join("/") !== slug.join("/")) {
      redirect(catalogueHref(categoryHref(chain), filters));
    }
    const known = slug.length === 1 ? config.departments.find((department) => department.slug === slug[0]) : undefined;
    if (!known) notFound();

    const pathname = `/c/${known.slug}`;
    const options = toProductCardOptions(known.slug, filters);
    const [listing, facets] = await Promise.all([getProductCards(options), getFacets(options)]);
    if (listing.total > 0 && listing.totalPages > 0 && filters.page > listing.totalPages) {
      redirect(catalogueHref(pathname, filters, { page: listing.totalPages }));
    }

    return (
      <div className="flex flex-col gap-6">
        <CategoryCrumbs ancestors={[]} name={known.label} />
        <CatalogueResults
          heading={{ title: known.label, countLabel: productCountLabel(listing.total) }}
          model={filterModel(pathname, filters, null, facets)}
          products={listing.items}
          empty={emptyCatalogueCopy(known.label, listing.total === 0 ? likelyCulprit(pathname, filters) : null)}
          page={listing.page}
          pageCount={listing.totalPages}
        />
      </div>
    );
  }

  const pathname = categoryHref([...resolved.ancestors, resolved.category]);
  const options = toProductCardOptions(resolved.category.slug, filters);
  const [listing, facets] = await Promise.all([getProductCards(options), getFacets(options)]);
  if (listing.total > 0 && listing.totalPages > 0 && filters.page > listing.totalPages) {
    redirect(catalogueHref(pathname, filters, { page: listing.totalPages }));
  }

  return (
    <div className="flex flex-col gap-6">
      <CategoryCrumbs ancestors={resolved.ancestors} name={resolved.category.name} />
      <CatalogueResults
        heading={{ title: resolved.category.name, countLabel: productCountLabel(listing.total) }}
        model={filterModel(pathname, filters, resolved, facets)}
        products={listing.items}
        empty={emptyCatalogueCopy(
          resolved.category.name,
          listing.total === 0 ? likelyCulprit(pathname, filters) : null,
        )}
        page={listing.page}
        pageCount={listing.totalPages}
      />
    </div>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const index = await getCategoryIndex();
  const resolved = resolveCategoryPath(index, slug);
  const known =
    slug.length === 1 ? config.departments.find((department) => department.slug === slug[0]) : undefined;
  const name = resolved?.category.name ?? known?.label ?? "Department";
  return { title: `${name} · ${config.siteName}` };
}

export default function CategoryPage(props: PageProps) {
  return (
    <Suspense fallback={<CategoryBrowseSkeleton />}>
      <CategoryBrowse {...props} />
    </Suspense>
  );
}
