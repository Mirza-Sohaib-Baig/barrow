"use client";

import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { config } from "@/lib/config";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function CategoryNav() {
  return (
    <nav aria-label="Departments" className="border-b border-border">
      <div className="mx-auto flex w-full max-w-[1280px] items-center px-4 py-2 md:px-6 lg:px-8">
        <Sheet>
          <SheetTrigger
            className="inline-flex h-10 items-center gap-2 rounded-[var(--radius)] border border-border px-3 text-small md:hidden"
            aria-label="Open departments"
          >
            <MenuIcon aria-hidden="true" className="size-4" />
            Departments
          </SheetTrigger>
          <SheetContent side="left" className="shadow-float">
            <SheetHeader>
              <SheetTitle className="text-h3">Departments</SheetTitle>
            </SheetHeader>
            <ul className="flex flex-col gap-1 px-4">
              {config.departments.map((department) => (
                <li key={department.slug}>
                  <SheetClose
                    render={<Link href={`/c/${department.slug}`} className="text-body" />}
                    className="flex h-10 items-center rounded-[var(--radius)] px-2 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    {department.label}
                  </SheetClose>
                </li>
              ))}
            </ul>
          </SheetContent>
        </Sheet>
        <ul className="hidden items-center gap-4 md:flex">
          {config.departments.map((department) => (
            <li key={department.slug}>
              <Link
                href={`/c/${department.slug}`}
                className="text-small text-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {department.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
