"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { formatPrice } from "@/lib/format";
import type { Suggestion } from "@/lib/queries/products";
import { cn } from "@/lib/utils";

const recentKey = "barrow.recentSearches";
const recentLimit = 8;

type Recent = { label: string };

function readRecents(): Recent[] {
  try {
    const raw = window.localStorage.getItem(recentKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const recents: Recent[] = [];
    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      const label = entry.trim();
      if (!label) continue;
      if (recents.some((item) => item.label.toLocaleLowerCase("en-GB") === label.toLocaleLowerCase("en-GB"))) {
        continue;
      }
      recents.push({ label });
      if (recents.length === recentLimit) break;
    }
    return recents;
  } catch {
    return [];
  }
}

function writeRecent(label: string) {
  const trimmed = label.trim();
  if (!trimmed) return;
  const next = [
    trimmed,
    ...readRecents()
      .map((item) => item.label)
      .filter((item) => item.toLocaleLowerCase("en-GB") !== trimmed.toLocaleLowerCase("en-GB")),
  ].slice(0, recentLimit);
  window.localStorage.setItem(recentKey, JSON.stringify(next));
}

function optionId(listId: string, index: number) {
  return `${listId}-option-${index}`;
}

export function SearchBar({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [recents, setRecents] = useState<Recent[]>([]);
  const showRecents = open && query.trim().length === 0 && recents.length > 0;
  const showSuggestions = open && query.trim().length > 0 && suggestions.length > 0;
  const optionCount = showRecents ? recents.length : showSuggestions ? suggestions.length : 0;

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      event.preventDefault();
      inputRef.current?.focus();
      inputRef.current?.select();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) return;
    const controller = new AbortController();
    const handle = window.setTimeout(() => {
      void fetch(`/api/suggest?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then(async (response) => {
          if (!response.ok) return { suggestions: [] as Suggestion[] };
          return (await response.json()) as { suggestions?: Suggestion[] };
        })
        .then((payload) => {
          setSuggestions(Array.isArray(payload.suggestions) ? payload.suggestions : []);
          setOpen(true);
          setActive(0);
        })
        .catch(() => undefined);
    }, 150);
    return () => {
      window.clearTimeout(handle);
      controller.abort();
    };
  }, [query]);

  function remember(label: string) {
    writeRecent(label);
    setRecents(readRecents());
  }

  function go(href: string, label: string) {
    remember(label);
    setOpen(false);
    router.push(href);
  }

  function choose(index: number) {
    if (showRecents) {
      const recent = recents[index];
      if (!recent) return;
      go(`/search?q=${encodeURIComponent(recent.label)}`, recent.label);
      return;
    }
    const suggestion = suggestions[index];
    if (!suggestion) return;
    if (suggestion.kind === "product") {
      go(`/p/${suggestion.slug}`, suggestion.label);
      return;
    }
    if (suggestion.kind === "category") {
      go(`/c/${suggestion.slug}`, suggestion.label);
      return;
    }
    const params = new URLSearchParams({ q: suggestion.label, brand: suggestion.label });
    go(`/search?${params.toString()}`, suggestion.label);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Home" || event.key === "End") {
      if (optionCount === 0) return;
      event.preventDefault();
      setOpen(true);
      setActive((current) => {
        if (event.key === "Home") return 0;
        if (event.key === "End") return optionCount - 1;
        if (event.key === "ArrowDown") return current >= optionCount - 1 ? 0 : current + 1;
        return current <= 0 ? optionCount - 1 : current - 1;
      });
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (event.key === "Enter") {
      if (open && optionCount > 0 && (showRecents || showSuggestions)) {
        event.preventDefault();
        choose(active);
        return;
      }
      event.preventDefault();
      const term = query.trim();
      if (!term) return;
      go(`/search?q=${encodeURIComponent(term)}`, term);
    }
  }

  const activeDescendant = optionCount > 0 ? optionId(listId, active) : undefined;

  return (
    <div className={cn("relative", className)}>
      <label htmlFor="site-search" className="sr-only">
        Search
      </label>
      <div className="relative">
        <SearchIcon
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          ref={inputRef}
          id="site-search"
          data-testid="search-input"
          role="combobox"
          type="search"
          placeholder="Search the shop"
          autoComplete="off"
          aria-expanded={open && optionCount > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeDescendant}
          value={query}
          className="h-10 rounded-[var(--radius)] pr-3 pl-9 text-body"
          onChange={(event) => {
            const next = event.target.value;
            setQuery(next);
            setOpen(true);
            if (next.trim().length < 2) setSuggestions([]);
          }}
          onFocus={() => {
            setRecents(readRecents());
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
        />
      </div>
      {optionCount > 0 ? (
        <div
          id={listId}
          role="listbox"
          className="absolute z-40 mt-2 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-popover p-2 shadow-float"
        >
          {showRecents ? (
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between px-2">
                <p className="text-small text-muted-foreground">Recent searches</p>
                <button
                  type="button"
                  className="min-h-8 px-2 text-small underline-offset-2 hover:underline"
                  onClick={() => {
                    window.localStorage.removeItem(recentKey);
                    setRecents([]);
                  }}
                >
                  Clear recent searches
                </button>
              </div>
              {recents.map((recent, index) => (
                <button
                  key={recent.label}
                  id={optionId(listId, index)}
                  type="button"
                  role="option"
                  aria-selected={index === active}
                  className={cn(
                    "flex min-h-10 items-center rounded-md px-2 text-left text-body",
                    index === active && "bg-muted",
                  )}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(index)}
                >
                  {recent.label}
                </button>
              ))}
            </div>
          ) : (
            <SuggestionGroups
              listId={listId}
              suggestions={suggestions}
              active={active}
              onHover={setActive}
              onChoose={choose}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

function SuggestionGroups({
  listId,
  suggestions,
  active,
  onHover,
  onChoose,
}: {
  listId: string;
  suggestions: Suggestion[];
  active: number;
  onHover: (index: number) => void;
  onChoose: (index: number) => void;
}) {
  const groups = [
    { kind: "product" as const, label: "Products" },
    { kind: "category" as const, label: "Categories" },
    { kind: "brand" as const, label: "Brands" },
  ];
  return (
    <div className="flex flex-col gap-2">
      {groups.map((group) => {
        const entries = suggestions
          .map((suggestion, index) => ({ suggestion, index }))
          .filter((entry) => entry.suggestion.kind === group.kind);
        if (entries.length === 0) return null;
        return (
          <div key={group.kind}>
            <p className="px-2 py-1 text-small text-muted-foreground">{group.label}</p>
            <ul>
              {entries.map(({ suggestion, index }) => (
                <li key={`${suggestion.kind}-${suggestion.label}-${index}`}>
                  <button
                    id={optionId(listId, index)}
                    type="button"
                    role="option"
                    aria-selected={index === active}
                    className={cn(
                      "flex min-h-10 w-full items-center gap-3 rounded-md px-2 text-left",
                      index === active && "bg-muted",
                    )}
                    onMouseEnter={() => onHover(index)}
                    onClick={() => onChoose(index)}
                  >
                    {suggestion.kind === "product" ? (
                      <>
                        <span className="relative size-10 shrink-0 overflow-hidden rounded-md bg-muted">
                          {suggestion.image ? (
                            <Image src={suggestion.image} alt="" fill sizes="40px" className="object-cover" />
                          ) : null}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-body">{suggestion.label}</span>
                        <span className="tnum text-small">{formatPrice(suggestion.priceInPence)}</span>
                      </>
                    ) : (
                      <span className="truncate text-body">{suggestion.label}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
