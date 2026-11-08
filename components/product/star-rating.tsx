import { Star } from "lucide-react";
import { ratingLabel, starFills, type StarFill } from "@/lib/product-card";
import { cn } from "@/lib/utils";

function StarGlyph({ fill }: { fill: StarFill }) {
  return (
    <span className="relative inline-block size-[0.8125rem] shrink-0" aria-hidden="true">
      <Star className="size-[0.8125rem] text-muted-foreground" strokeWidth={1.5} />
      {fill > 0 ? (
        <span
          className={cn(
            "absolute inset-0",
            fill === 0.5 && "[clip-path:inset(0_50%_0_0)]",
          )}
        >
          <Star
            className="size-[0.8125rem] fill-(--color-rating) text-(--color-rating)"
            strokeWidth={1.5}
          />
        </span>
      ) : null}
    </span>
  );
}

export function StarRating({ rating, count }: { rating: number; count?: number }) {
  const fills = starFills(rating);

  return (
    <span
      role="img"
      aria-label={ratingLabel(rating, count)}
      className="inline-flex shrink-0 gap-1"
    >
      {fills.map((fill, index) => (
        <StarGlyph key={index} fill={fill} />
      ))}
    </span>
  );
}
