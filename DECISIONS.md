# Decisions

A running log of what was chosen, what was cut, and why. Newest at the bottom within each day.

## 2026-11-09, setup

- Build Barrow as its own brand from the first commit rather than cloning Amazon's interface
  first and redesigning later. The assessment scores product judgement and UX, neither of which
  rewards matching a competitor's colour palette.
- No `CLAUDE.md`. Cursor is the only agent working on this repo and it picks up `AGENTS.md`
  through `.cursor/rules/`, so a second pointer file was redundant and was removed.
- shadcn initialised with the `base-nova` preset: Base UI primitives, neutral base colour,
  Lucide icons, Geist. The CLI no longer takes a `--base-color` flag.
- `partialPrefetching` stays on beside `cacheComponents`, because Next.js 16.4 warns if it is
  left unset.
- `agentRules` is false so `next dev` does not append its managed block to `AGENTS.md`.
- `drizzle.config.ts` points at `lib/schema.ts`. The `drizzle/` directory holds generated
  migrations only.
- ESLint ignores `.cursor/**` so the capture hook is not rewritten to satisfy the linter.
- `@types/node` is pinned to 22, matching the installed Node 22 runtime and the Vitest 5 peer
  range.
- `formatPrice` splits integer pence into pounds and a two-digit remainder and returns one
  string. `formatDate` uses `Europe/London`.
- Standard delivery is stored as 399 pence. Waiving it above `freeShippingThreshold` is
  `lib/pricing.ts`, which is a later slice.
- `lib/utils.ts` uses the standard local `cn` helper built from `clsx` and `tailwind-merge`.
  An npm package named `cn` was installed by mistake and removed.
- `shadcn` and `drizzle-kit` moved to `devDependencies`. Both are build-time tools.

## Product scope

- **No seller or vendor side.** A second product with its own auth model, invisible to a
  buyer-focused demo.
- **No sponsored placements.** They degrade result quality and there is no advertiser to serve.
  Cutting them is a product position, not a gap.
- **No webhooks.** Payment is verified by re-reading the PaymentIntent inside `placeOrder`,
  which needs no public endpoint, no local tunnel and no signature verification, and is strictly
  safer than trusting a client callback.
- **No background jobs.** Order status is derived from the order's age, so the whole delivery
  lifecycle is demoable without a queue or a cron.
- **No unverifiable discounts.** A strikethrough list price and a savings badge appear only when
  that list price actually occurs in the product's 90-day price history. Where it does not, the
  discount is suppressed entirely. This is a direct response to how reference prices are used
  across large marketplaces.
- **No upsells in checkout.** Zero interruptions between the cart and the order confirmation.
- **No review photos or video.** Upload pipeline, moderation and storage, none of which a
  grader sees.
- **No multiple wishlists, language pickers or country pickers.** Each doubles a code path for
  nothing visible.
- **No image re-hosting.** Product photos load from the dataset's own URLs, declared in
  `next.config.ts` remote patterns.
- **No internationalisation.** GBP and `en-GB` only.
- **Returns are in scope,** unlike most rebuilds of this kind. A return request on a delivered
  order completes the lifecycle and costs roughly ninety minutes.

## 2026-11-09, schema

- The Drizzle schema lives in `drizzle/schema.ts`, with migrations in `drizzle/migrations`.
  This replaces the earlier `lib/schema.ts` path because the schema request named `drizzle/schema.ts`.
- `CREATE EXTENSION pg_trgm` is hand-written at the top of `0000_init.sql`. drizzle-kit does not emit extensions.
- Orders do not store a fulfilment status column. Age boundaries are 4h packed, 24h shipped, 48h out for delivery, and 72h delivered. `cancelledAt` wins over `returnRequestedAt`.
- `productTopics` and `pricePoints` are not in this table list, so they wait for the review-intelligence and price-history slices.
- Primary keys are UUIDs. Owned shopper rows cascade on user delete. Orders and ordered products restrict. Optional review and contact links set null.
- `addresses.line2`, `categories.parentId`, `categories.imageUrl`, and `products.searchVector` are nullable. Contact requests default to status `open`. A wishlist row is unique per user and product. Guest cart and view-history rows are indexed on `sessionKey`.
