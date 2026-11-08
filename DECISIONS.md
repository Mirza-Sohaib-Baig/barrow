# Decisions

2026-11-09 — CLAUDE.md is the single line `@AGENTS.md`, so the pointer imports AGENTS.md.
2026-11-09 — `partialPrefetching` stays on beside `cacheComponents`, because Next.js 16.4 warns if it is left unset.
2026-11-09 — `agentRules` is false so `next dev` does not append its managed block to `AGENTS.md`.
2026-11-09 — shadcn uses the `base-nova` preset: Base UI primitives, neutral base color, Lucide, and Geist. The CLI no longer has a `--base-color` flag.
2026-11-09 — Standard delivery is stored as 399 pence. Waiving it over `freeShippingThreshold` belongs in `lib/pricing.ts`, which is a later slice.
2026-11-09 — `formatPrice` splits integer pence into pounds and a two-digit remainder. `formatDate` uses `Europe/London`.
2026-11-09 — `@types/node` is 22, matching the installed Node 22 runtime and the Vitest 5 peer range.
2026-11-09 — ESLint ignores `.cursor/**` so the capture hook is not rewritten to satisfy the linter.
2026-11-09 — `drizzle.config.ts` points at `lib/schema.ts`, which is created in the schema slice. `db:seed` and `import` point at scripts that are not written yet.
