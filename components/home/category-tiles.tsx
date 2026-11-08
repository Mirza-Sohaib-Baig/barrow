import Image from "next/image";
import Link from "next/link";
import { focusRingClass } from "@/components/product/metrics";
import { cn } from "@/lib/utils";

export type CategoryTile = {
  slug: string;
  name: string;
  imageUrl: string | null;
};

export function CategoryTiles({ tiles }: { tiles: CategoryTile[] }) {
  if (tiles.length === 0) return null;

  return (
    <ul aria-label="Departments" className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {tiles.map((tile) => (
        <li key={tile.slug}>
          <Link
            href={`/c/${tile.slug}`}
            className={cn(
              "flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card",
              focusRingClass,
            )}
          >
            <span className="relative aspect-[4/3] bg-muted">
              {tile.imageUrl ? (
                <Image
                  src={tile.imageUrl}
                  alt=""
                  fill
                  sizes="(min-width: 768px) 25vw, 50vw"
                  className="object-cover"
                />
              ) : null}
            </span>
            <span className="p-4 text-h3">{tile.name}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
