"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function FilterSheet({ children }: { children: ReactNode }) {
  return (
    <div className="lg:hidden">
      <Sheet>
        <SheetTrigger
          className="inline-flex h-10 items-center rounded-lg border border-border bg-card px-3 text-small focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Open filters"
        >
          Filters
        </SheetTrigger>
        <SheetContent side="left" className="w-full overflow-y-auto shadow-float sm:max-w-sm">
          <SheetHeader>
            <SheetTitle className="text-h3">Filters</SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">{children}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
