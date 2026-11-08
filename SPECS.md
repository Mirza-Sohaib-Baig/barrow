# Slice specs

One entry per slice in `roadmap.md`. Read the entry before coding the slice. Each says what the
slice does, what proves it works, and what is out of scope for it.

Format is deliberately short. A spec that takes ten minutes to read is a spec nobody reads at
hour 14.

---

## Step-03, schema

**Does.** Defines every table in `lib/schema.ts`, generates the first migration, enables
`pg_trgm`, and adds `lib/order-status.ts` as a pure derivation of status from order age.

**Proves.** `npm run db:migrate` succeeds against Neon and every table exists. Unit tests for
`deriveStatus` pass at every age threshold and for both overrides.

**Not.** No queries, no UI, no seed data.

---

## Step-04, catalogue import

**Does.** Fetches, transforms and loads the Amazon Reviews 2023 dataset into products,
categories, reviews, `productTopics` and `pricePoints`. Runs from `npm run import`.

**Proves.** Row counts reported per table and per category. Between 8,000 and 10,000 products,
each with at least one image, a parseable price and three or more reviews. `data/README.md`
records the source and licence.

**Not.** Nothing user-facing. Runs once, locally, against the production database.

---

## A1, brand and chrome

**Does.** Writes the token set from `DESIGN.md` into `app/globals.css` for both themes, loads
Fraunces and Geist, builds the SVG wordmark, and builds the app shell: header with search,
theme toggle, account menu, wishlist and cart count, a category strip, and a footer with the
unaffiliated notice.

**Proves.** Shell renders at 375, 768 and 1440. Theme toggle persists across reload. Every
contrast pair in the `DESIGN.md` table clears AA in both themes.

**Not.** No catalogue data on screen yet. The home page body is still a placeholder panel.

---

## A2, query layer

**Does.** `lib/queries/products.ts` with `getProductCards`, `getFacets`, `getProductBySlug`,
`getHomeData`, `getSuggestions`, and `lib/queries/reviews.ts` with `getReviews` and
`getRatingHistogram`. Catalogue reads wrapped in `'use cache'` with per-category and global
tags.

**Proves.** Unit tests cover filter and sort clause building. `getHomeData` returns no more than
100 cards in total. No cached function takes a user id.

**Not.** No UI. No cart, order or account queries.

---

## A3, product card and grid

**Does.** `product-card`, `product-card-skeleton`, `product-grid`, `product-rail`,
`star-rating`, `price`, built to the specification in `DESIGN.md`.

**Proves.** `/dev/components` renders every state: out of stock, low stock, no list price,
verified saving, long title, zero reviews, missing image. Skeleton dimensions match the card
exactly, so switching between them shifts nothing.

**Not.** No pages consume these yet.

---

## A4, home and category

**Does.** Home with hero, category tiles, deals rail, recently viewed and per-category rails.
Category browse at `/c/[...slug]` with breadcrumb, filter sidebar, grid, sort and pagination.
All filter state in searchParams.

**Proves.** A filtered category URL pasted into a new tab reproduces the same results. Back
button works through filter changes. Everything below the fold is inside its own Suspense
boundary. Empty state names the likely culprit filter.

**Not.** No search page. The sidebar and grid are built here but shared with A5.

---

## A5, search

**Does.** Header combobox with debounced typeahead against `/api/suggest`, results page reusing
the A4 sidebar and grid, applied-filter chip bar, honest result count, no-results state with
suggested alternatives, and `/` as a focus shortcut.

**Proves.** Playwright: search a term, apply two filters, change sort, reload, identical
results. Keyboard alone can open suggestions, move through them, select one and dismiss.

**Not.** No sponsored results, ever.

---

## B1, product detail

**Does.** `/p/[slug]` with gallery, tabbed details for Overview, Specs and Reviews, sticky
purchase panel on desktop and a sticky bottom bar on mobile, rating histogram that filters the
review list, related products rail, metadata, not-found and loading states. Records a view in
`viewHistory`.

**Proves.** Tab state is in the URL so a review link is shareable. The price appears once in the
purchase panel. Gallery works by click, arrow key and swipe. Reviews paginate.

**Not.** No add to cart yet, the button is present but inert until B2.

---

## B2, cart and wishlist

**Does.** Guest `cartKey` cookie, `lib/pricing.ts` as a pure tested function, cart and wishlist
queries and actions, the slide-in cart drawer, the full cart page with saved for later, and the
free shipping progress bar.

**Proves.** Pricing unit tests pass at the threshold boundary, one penny under, empty cart and
tax rounding. Header count moves optimistically and rolls back on a forced failure. A guest can
fill a cart with no account.

**Not.** No checkout. No merge on sign in, that is B3.

---

## B3, accounts and sessions

**Does.** `lib/auth.ts`, sign up and sign in actions with field-level errors, middleware guards,
the sign in and sign up pages, the demo account button, the seed that creates the demo user with
an address and three orders at different ages, and `lib/cart-merge.ts`.

**Proves.** Unit tests for session signing, verification, expiry, tampering, and the cart merge
quantity collision. Playwright: add to cart as a guest, sign in, cart survives with correct
quantities. The demo button signs in from a clean incognito window in one click.

**Not.** No account settings pages, that is C3.

---

## B4, Stripe checkout

**Does.** One-page checkout with address, shipping speed and Payment Element, a live order
summary, and `placeOrder` doing the PaymentIntent re-read, stock re-check, and single
transaction creating the order with snapshots.

**Proves.** Playwright: product to cart to test card to created order. A tampered client total
does not change what is charged or what the order records. Out-of-stock mid-checkout fails with
the item named and the cart intact. Double-submit is impossible.

**Not.** No upsells, no cross-sells, no interstitials. No webhooks.

---

## B5, buy now

**Does.** A single-item checkout context keyed in the session, reachable from the product page,
that does not touch the existing cart.

**Proves.** Playwright: cart has two items, buy now a third, complete it, cart still has exactly
the original two.

**Not.** No separate checkout UI. Reuses B4.

---

## C1, orders and timeline

**Does.** Ownership-filtered order queries, the orders list with status tabs and search, the
order detail page doubling as the post-checkout confirmation, the derived-status timeline, and
the reorder action. A development-only `?demoAge=` to shift perceived age for the walkthrough.

**Proves.** The timeline matches `deriveStatus` for a given `placedAt`. Reorder reports which
items could not be added and why. `?demoAge=` has no effect in production.

**Not.** No cancel or return yet.

---

## C2, cancel and return

**Does.** Cancel while PLACED or PACKED with a Stripe refund, `cancelledAt` and stock restored in
one transaction. Return within the window after DELIVERED, with item selection, a reason, a
server-computed refund preview and a partial refund.

**Proves.** Unit tests at both window boundaries. Playwright: cancel an order, stock is restored.
Outside the window the button is visible but disabled with a tooltip saying when it expired.

**Not.** No returns processing, no label generation, no agent workflow.

---

## C3, account

**Does.** Four tabs as real routes: profile and security, addresses, payment methods, orders.
Password change requires the current password. Deleting a default address promotes another.

**Proves.** Playwright: requesting another user's address by id returns not found. Every query
in this slice includes the session user id in its where clause.

**Not.** No avatar upload, no notification preferences, no deletion of the account.

---

## C4, reviews and customer service

**Does.** Buyer-only reviews, one per product, enforced in the action. Helpful votes. Aggregates
updated in the same transaction. A help page with order shortcuts, searchable Q&A and a
trackable contact form.

**Proves.** Unit tests for all three ineligibility cases. Submitting a review changes the
product's `ratingAverage` immediately. A contact request returns a reference the user can find
again under their account.

**Not.** No review photos, no moderation queue, no agent replies.

---

## D1, review intelligence

**Does.** `productTopics` computed during import from the review corpus against a category-keyed
vocabulary, plus a stored verdict line per product. Topic pills on the product page that filter
the review list and surface a sample quote.

**Proves.** Topics appear for at least 80 percent of products with five or more reviews.
Clicking a pill filters the list. Nothing calls a model at request time.

**Not.** No sentiment model, no embeddings. Keyword grouping and mean rating only.

---

## D2, honest buy box

**Does.** 90 days of `pricePoints` per product. An honest price line computed from that history,
a sparkline popover, and suppression of any strikethrough or savings badge whose list price does
not appear in the history.

**Proves.** A product whose current price is not the 90-day low never says it is. A product with
a fabricated list price shows no discount badge at all. The decision is recorded in
`DECISIONS.md` and stated in the README.

**Not.** No price alerts, no watch list, no notifications.

---

## D3, compare, optional

**Does.** Compare selection on cards, a cookie-backed set capped at four, a sticky tray, and a
comparison page over the union of all spec keys with identical rows collapsed by default.

**Proves.** Four products with overlapping specs show only their differences until the toggle is
opened. The comparison is shareable by URL.

**Not.** Cut this before cutting anything in A, B, C, D1 or D2.

---

## D4, performance

**Does.** Audits rail counts, cache tags and image configuration, then measures with
`scripts/load-check.ts` against the deployed URL and writes `docs/performance.md`.

**Proves.** Home page full response under 1.5s at 10 concurrent users. Lighthouse mobile scores
recorded for home and a product page. The README quotes the generated table, not an estimate.

**Not.** No CDN work, no edge runtime migration, no claims that were not measured.

---

## H1 to H4, hardening

**H1 audit.** Walk every route at three widths in both themes, write `AUDIT.md` as Route, Issue,
Severity, Fix. Change no code.

**H2 fix.** Every High and every sub-five-minute Medium, route by route. No new features.

**H3 tests.** Bring unit tests to 60 to 80 and end-to-end to 8 to 12, covering the list in
`ARCHITECTURE.md`.

**H4 sweep.** Grep for leftovers, verify every id-taking query filters on ownership, verify no
secret reaches a client bundle, confirm `loading.tsx` and `error.tsx` coverage, report the route
table.

---

## S1 to S4, submission

**S1 README.** Thirteen sections, real numbers, no badges, closing unaffiliated notice.

**S2 verification.** Five commands green, `.agent-logs/` across many commits, no tracked secrets,
seed clean on an empty database, every route 200 or correctly redirecting when signed out.

**S3 human checks.** Private window on a fresh device through the full loop, same on a phone,
demo account works, repo loads signed out of GitHub, Vercel on latest `main`.

**S4 walkthrough.** Under five minutes, camera on, second take, script in `WALKTHROUGH.md`.
