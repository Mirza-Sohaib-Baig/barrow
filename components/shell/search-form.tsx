import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

export function SearchForm({ className }: { className?: string }) {
  return (
    <form role="search" action="/" method="get" className={className}>
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          id="site-search"
          name="q"
          type="search"
          placeholder="Search the shop"
          className="h-10 rounded-[var(--radius)] pr-3 pl-9 text-body"
        />
      </div>
    </form>
  );
}
