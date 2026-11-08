import Image from "next/image";
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { AddToCartButton } from "@/components/product/add-to-cart-button";
import {
  focusRingClass,
  productCardActionClass,
  productCardBodyClass,
  productCardFrameClass,
  productCardHoverClass,
  productCardImageClass,
  productCardImageSizes,
  productCardPriceClass,
  productCardRatingClass,
  productCardStockClass,
  productCardTitleClass,
} from "@/components/product/metrics";
import { Price } from "@/components/product/price";
import { StarRating } from "@/components/product/star-rating";
import { WishlistButton } from "@/components/product/wishlist-button";
import {
  formatRating,
  formatReviewCount,
  stockLabel,
  type ProductCard as ProductCardData,
} from "@/lib/product-card";
import { cn } from "@/lib/utils";

export function ProductCard({
  product,
  sizes = productCardImageSizes,
  saved = false,
}: {
  product: ProductCardData;
  sizes?: string;
  saved?: boolean;
}) {
  const label = stockLabel(product.stock);
  const stockClass =
    product.stock <= 0 ? "text-(--color-out-of-stock)" : "text-(--color-low-stock)";

  return (
    <article className={cn(productCardFrameClass, productCardHoverClass)}>
      <Link
        href={`/p/${product.slug}`}
        className={cn("flex min-w-0 flex-col rounded-lg", focusRingClass)}
      >
        <div className={productCardImageClass}>
          {product.image ? (
            <Image
              src={product.image}
              alt={product.title}
              fill
              sizes={sizes}
              className="object-cover"
            />
          ) : (
            <span className="absolute inset-0 flex items-center justify-center">
              <ImageOff className="size-8 text-muted-foreground" aria-hidden="true" />
            </span>
          )}
        </div>
        <div className={productCardBodyClass}>
          <h3 className={productCardTitleClass}>{product.title}</h3>
          <div className={productCardRatingClass}>
            <StarRating rating={product.ratingAverage} count={product.reviewCount} />
            <span aria-hidden="true" className="tnum text-small text-muted-foreground">
              {formatRating(product.ratingAverage)}
            </span>
            <span aria-hidden="true" className="tnum text-small text-muted-foreground">
              ({formatReviewCount(product.reviewCount)})
            </span>
          </div>
          <div className={productCardPriceClass}>
            <Price
              priceInPence={product.priceInPence}
              listPriceInPence={product.listPriceInPence}
              size="h3"
              savings={product.listPriceInPence != null}
            />
          </div>
          <p className={productCardStockClass}>
            {label ? <span className={stockClass}>{label}</span> : null}
          </p>
        </div>
      </Link>
      <div className={cn(productCardActionClass, "relative z-10")}>
        <AddToCartButton productId={product.id} outOfStock={product.stock <= 0} />
      </div>
      <WishlistButton
        productId={product.id}
        saved={saved}
        className="absolute top-2 right-2 z-10"
      />
    </article>
  );
}
