import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { Gallery } from "@/components/product/gallery";
import { focusRingClass } from "@/components/product/metrics";
import { ProductTabs } from "@/components/product/product-tabs";
import { parseProductQuery, productHref } from "@/components/product/product-params";
import { ProductRail } from "@/components/product/product-rail";
import { PurchasePanel } from "@/components/product/purchase-panel";
import { RecordView } from "@/components/product/record-view";
import { ReviewsPanel } from "@/components/product/reviews-panel";
import { StarRating } from "@/components/product/star-rating";
import { ProductDetailSkeleton } from "@/app/(site)/p/[slug]/loading";
import { config } from "@/lib/config";
import { deliveryWindow, formatDeliveryWindow } from "@/lib/delivery";
import { formatRating, formatReviewCount, ratingLabel } from "@/lib/product-card";
import { getProductBySlug } from "@/lib/queries/products";
import { getRatingHistogram, getReviews } from "@/lib/queries/reviews";
import { cn } from "@/lib/utils";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function summary(description: string): string {
  const flat = description.replace(/\s+/g, " ").trim();
  if (flat.length <= 160) return flat;
  const clipped = flat.slice(0, 160);
  const space = clipped.lastIndexOf(" ");
  return (space >= 100 ? clipped.slice(0, space) : clipped).trim();
}

function standardWindow(now: Date): string {
  for (const option of config.shippingOptions) {
    if (option.id === "standard") return formatDeliveryWindow(deliveryWindow(option, now));
  }
  const fallback = config.shippingOptions[0];
  if (!fallback) return formatDeliveryWindow(deliveryWindow({ minDays: 3, maxDays: 5 }, now));
  return formatDeliveryWindow(deliveryWindow(fallback, now));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return { title: `Product not found · ${config.siteName}` };

  const description = summary(product.description);
  const image = product.imageUrls[0];
  const title = `${product.title} · ${config.siteName}`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

async function ProductView({ params, searchParams }: PageProps) {
  const [{ slug }, raw] = await Promise.all([params, searchParams]);
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const query = parseProductQuery(raw);
  let reviews: ReactNode = null;
  if (query.tab === "reviews") {
    const [histogram, reviewPage] = await Promise.all([
      getRatingHistogram(product.id),
      getReviews(product.id, {
        sort: query.sort,
        page: query.page,
        rating: query.rating,
      }),
    ]);
    if (reviewPage.totalPages > 0 && query.page > reviewPage.totalPages) {
      redirect(productHref(product.slug, query, { page: reviewPage.totalPages }));
    }
    reviews = (
      <ReviewsPanel slug={product.slug} query={query} histogram={histogram} reviews={reviewPage} />
    );
  }

  const reviewCount = product.reviewCount;
  const ratingText =
    reviewCount === 0
      ? "No reviews yet"
      : `${formatRating(product.ratingAverage)} (${formatReviewCount(reviewCount)})`;

  return (
    <div className="flex flex-col gap-12 pb-24 lg:pb-0">
      <RecordView productId={product.id} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)_18rem] lg:items-start">
        <Gallery key={product.id} title={product.title} images={product.imageUrls} />
        <div className="flex min-w-0 flex-col gap-4">
          <h1 className="text-h1 break-words">{product.title}</h1>
          {product.brand ? <p className="text-body text-muted-foreground">{product.brand}</p> : null}
          <Link
            href={productHref(product.slug, query, { tab: "reviews" })}
            aria-label={`${ratingLabel(product.ratingAverage, reviewCount)}. Read reviews`}
            className={cn("inline-flex min-h-10 w-fit flex-wrap items-center gap-2 rounded-lg", focusRingClass)}
          >
            <StarRating rating={product.ratingAverage} count={reviewCount} />
            <span aria-hidden="true" className="text-small text-muted-foreground">
              {ratingText}
            </span>
          </Link>
          <ProductTabs
            slug={product.slug}
            query={query}
            bullets={product.bullets}
            description={product.description}
            specs={product.specs}
            reviews={reviews}
          />
        </div>
        <div className="lg:sticky lg:top-4">
          <PurchasePanel
            productId={product.id}
            priceInPence={product.priceInPence}
            listPriceInPence={product.listPriceInPence}
            stock={product.stock}
            deliveryLabel={standardWindow(new Date())}
          />
        </div>
      </div>
      {product.related.length > 0 ? (
        <ProductRail
          title="Related products"
          products={product.related}
          href={`/c/${product.category.slug}`}
        />
      ) : null}
    </div>
  );
}

export default function ProductPage(props: PageProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductView {...props} />
    </Suspense>
  );
}
