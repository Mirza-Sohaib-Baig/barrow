"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { focusRingClass } from "@/components/product/metrics";
import { cn } from "@/lib/utils";

const imageSizes = "(min-width: 1024px) 50vw, 100vw";

export type GalleryProps = {
  title: string;
  images: string[];
};

type Gesture = {
  x: number;
  y: number;
  pointerId: number;
};

function allowZoom(): boolean {
  return (
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export function Gallery({ title, images }: GalleryProps) {
  const [index, setIndex] = useState(0);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const gesture = useRef<Gesture | null>(null);
  const count = images.length;
  const active = count === 0 ? 0 : Math.min(index, count - 1);
  const src = images[active];

  function show(next: number) {
    if (count < 2) return;
    const wrapped = ((next % count) + count) % count;
    setOrigin(null);
    setIndex(wrapped);
  }

  if (!src) {
    return (
      <div className="flex aspect-square items-center justify-center rounded-lg bg-muted p-6 text-center text-body text-muted-foreground">
        {title}
      </div>
    );
  }

  const label = `${title}, image ${active + 1} of ${count}`;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div
        tabIndex={0}
        role="group"
        aria-label={label}
        className={cn(
          "relative aspect-square overflow-hidden rounded-lg bg-muted touch-pan-y",
          focusRingClass,
        )}
        onKeyDown={(event) => {
          if (event.key === "ArrowLeft") {
            event.preventDefault();
            show(active - 1);
          } else if (event.key === "ArrowRight") {
            event.preventDefault();
            show(active + 1);
          }
        }}
        onPointerDown={(event) => {
          if (event.pointerType === "mouse") return;
          gesture.current = {
            x: event.clientX,
            y: event.clientY,
            pointerId: event.pointerId,
          };
        }}
        onPointerUp={(event) => {
          const start = gesture.current;
          gesture.current = null;
          if (!start || start.pointerId !== event.pointerId) return;
          const dx = event.clientX - start.x;
          const dy = event.clientY - start.y;
          if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
          show(active + (dx < 0 ? 1 : -1));
        }}
        onPointerCancel={() => {
          gesture.current = null;
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse" || !allowZoom()) return;
          const rect = event.currentTarget.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return;
          const x = ((event.clientX - rect.left) / rect.width) * 100;
          const y = ((event.clientY - rect.top) / rect.height) * 100;
          setOrigin({
            x: Math.min(100, Math.max(0, x)),
            y: Math.min(100, Math.max(0, y)),
          });
        }}
        onPointerLeave={() => setOrigin(null)}
      >
        <Image
          src={src}
          alt={title}
          fill
          priority={active === 0}
          sizes={imageSizes}
          className="pointer-events-none object-cover"
          style={
            origin
              ? { transform: "scale(2)", transformOrigin: `${origin.x}% ${origin.y}%` }
              : undefined
          }
        />
        <p className="sr-only" aria-live="polite">
          {label}
        </p>
      </div>
      {count > 1 ? (
        <ul className="flex gap-2 overflow-x-auto">
          {images.map((image, imageIndex) => {
            const selected = imageIndex === active;
            return (
              <li key={`${image}-${imageIndex}`} className="shrink-0">
                <button
                  type="button"
                  aria-label={`Show image ${imageIndex + 1} of ${count}`}
                  aria-current={selected ? "true" : undefined}
                  onClick={() => show(imageIndex)}
                  className={cn(
                    "relative size-16 overflow-hidden rounded-lg border bg-muted",
                    focusRingClass,
                    selected ? "border-foreground" : "border-border",
                  )}
                >
                  <Image src={image} alt="" fill sizes="64px" className="object-cover" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
