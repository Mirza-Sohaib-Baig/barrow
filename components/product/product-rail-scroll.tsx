"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { iconButtonClass } from "@/components/product/metrics";
import { cn } from "@/lib/utils";

function RailButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const next = direction === "next";

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-y-0 z-10 hidden items-center md:flex",
        next ? "right-0" : "left-0",
      )}
    >
      <button
        type="button"
        className={cn(iconButtonClass, "pointer-events-auto")}
        aria-label={next ? "Next products" : "Previous products"}
        onClick={onClick}
      >
        {next ? (
          <ChevronRight className="size-4" aria-hidden="true" />
        ) : (
          <ChevronLeft className="size-4" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}

export function ProductRailScroll({
  labelledBy,
  children,
}: {
  labelledBy: string;
  children: ReactNode;
}) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  function scrollByCard(direction: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-rail-card]");
    const gap = Number.parseFloat(getComputedStyle(el).columnGap) || 16;
    const amount = card instanceof HTMLElement ? card.offsetWidth + gap : el.clientWidth;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: direction * amount, behavior: reduce ? "auto" : "smooth" });
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      scrollByCard(1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      scrollByCard(-1);
    }
  }

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        role="region"
        aria-labelledby={labelledBy}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="flex gap-4 overflow-x-auto overscroll-x-contain scroll-px-0 pb-1 snap-x snap-mandatory focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {children}
      </div>
      {canPrev ? <RailButton direction="previous" onClick={() => scrollByCard(-1)} /> : null}
      {canNext ? <RailButton direction="next" onClick={() => scrollByCard(1)} /> : null}
    </div>
  );
}
