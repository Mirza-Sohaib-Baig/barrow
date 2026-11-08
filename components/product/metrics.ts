import { cn } from "@/lib/utils";

export const productCardImageSizes =
  "(min-width: 1280px) 230px, (min-width: 1024px) calc((100vw - 112px) / 4), (min-width: 768px) calc((100vw - 80px) / 3), calc((100vw - 48px) / 2)";

export const productRailImageSizes =
  "(min-width: 1024px) 220px, (min-width: 640px) 200px, 168px";

export const productGridClass =
  "grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5";

export const productRailCardClass =
  "w-[168px] shrink-0 snap-start sm:w-[200px] lg:w-[220px]";

export const focusRingClass =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export const productCardFrameClass =
  "relative flex h-full flex-col rounded-lg border border-border bg-card";

export const productCardHoverClass =
  "transition-shadow duration-[120ms] ease-out hover:shadow-raise motion-reduce:transition-none dark:hover:border-foreground/25";

export const productCardImageClass =
  "relative aspect-square w-full overflow-hidden rounded-t-lg bg-muted";

export const productCardBodyClass = "flex flex-col gap-2 px-4 pt-4";

export const productCardTitleClass = "line-clamp-2 h-[2.925rem] text-h3";

export const productCardRatingClass =
  "flex min-h-[1.178125rem] flex-wrap items-center gap-x-2 gap-y-1";

export const productCardPriceClass = "min-h-[1.4625rem]";

export const productCardStockClass = "h-[1.178125rem] text-small";

export const productCardActionClass = "px-4 pt-4 pb-4";

export const iconButtonClass = cn(
  "inline-flex size-10 items-center justify-center rounded-lg border border-border bg-card text-foreground transition-colors duration-[120ms] ease-out hover:bg-muted motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50",
  focusRingClass,
);

export const cartButtonClass = cn(
  "inline-flex h-10 w-full items-center justify-center rounded-lg border border-border bg-card px-4 text-body text-foreground transition-colors duration-[120ms] ease-out hover:bg-muted motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-50",
  focusRingClass,
);

export const textLinkClass = cn(
  "text-body underline underline-offset-4",
  focusRingClass,
);
