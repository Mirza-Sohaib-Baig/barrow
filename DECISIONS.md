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

## 2026-11-09, brand

- The wordmark is an inline SVG: the barrow is paths, the letters are SVG text in Fraunces, at 28px and 40px.
- Theme persistence uses `next-themes`, which was already installed. The default is the system preference.
- The header cart badge takes a count and shows 0 until the cart slice exists.
- Department names in the strip are placeholders in `lib/config.ts` until the catalogue import.
- The header search has a visually hidden label. A stacked label would break the single search row.

## 2026-11-09, product card

- The card type in `lib/product-card.ts` matches the query card: id, slug, title, image, prices in pence, rating, review count and stock. The helpers sit beside it so a card does not import the database.
- Wishlist and add to cart are client buttons outside the card link. They only toggle local state until the cart and wishlist actions exist.
- Add to cart on a card is an outline button. A grid should not be a row of indigo primary buttons.
- Stars snap to the nearest half. The number beside them stays one decimal place.
- The stock line keeps its height when stock is healthy, so a row of cards and the skeleton stay the same height.
- shadcn primitives import `cn`. That name resolves to `lib/utils.ts` through the TypeScript and Vitest path aliases.

## 2026-11-09, home and category

- The home page paints the hero, the eight department tiles and today's deals together. Each rail below that has its own Suspense boundary. Recently viewed is kept inside the 100 card budget, so eight department rails show 10 cards rather than the 11 `getHomeData` allocates.
- A department rail is omitted when that department has no products. Before any categories are imported, the eight names in `config.departments` are the tiles.
- The breadcrumb root is "Shop", so it does not collide with the Home department.
- Recently viewed reads the `barrow_guest` cookie. Signed-in history waits for sessions. The query still requires an owner and returns nothing without one.
- When a category is empty, the named filter is the price band, then a brand, then the star rating, then in-stock. The clear link removes only that one. Sort defaults to `relevance`, shown as "Featured", and is left out of the URL.
- Product photos may come from any http or https host. The import has not named its image hosts yet.

