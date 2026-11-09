# Barrow build roadmap

A department store web app. A rebuild of Amazon's buyer experience with an independent
interface, built as a 20-hour technical assessment.

This file is the source of truth for what gets built and in what order. The agent reads it
at the start of every session, works the single next slice marked `[pending]`, and marks it
`[done]` at the end. New slices are added by the human only.

---

## Rules

**R1. One slice per session.** A slice is a user-visible capability, from database through to
screen. Never two in one session. Never a layer or a file as a unit of work.

**R2. Spec before code.** Every slice has a four-line spec in `docs/specs/<slice>.md` saying what
it does and how you know it works. No spec, write one and show it before coding.

**R3. Four green checks before done.** `npm run typecheck`, `npm run lint`, `npm run build`,
`npm test`. All four pass before reporting a slice complete.

**R4. Always deployed.** Every slice ends with commit, push, deploy, and a click on the live URL.
Never start a slice with the previous one undeployed.

**R5. Logs ride along.** `.agent-logs/` goes into the same commit as the slice it belongs to,
never batched at the end.

**R6. Decisions get written down.** Any choice not specified here goes into `DECISIONS.md` as a
dated one-line row, in the same session it was made.

**R7. Free tier only.** Neon, Vercel Hobby, Stripe test mode. No paid services, no paid domain.

**R8. Scope is closed.** The agent proposes, the human disposes. Nothing is added to this file by
the agent.

**R9. Money is integer pence.** Never float. All totals computed server side by `lib/pricing.ts`.

**R10. Ownership is checked.** Every read or write touching shopper data filters on the session
user id. No exceptions, and this is the one rule worth failing a review over.

**R11. Never cache a user.** `'use cache'` is for catalogue reads only. Nothing taking a session
id goes inside a cache boundary.

**R12. Time-box the fights.** Any single problem that has taken 45 minutes gets the fallback from
the risks table, not another 45 minutes.

**R13. Stop building at hour 16.** Whatever state things are in. The last four hours are
hardening, README, verification and recording.

---

## Step 0 to 2: foundation

### Step-00: agent capture `[done]`
Run the 8x capture setup by hand. Confirm the capture test passes and `.agent-logs/` is written
to and is not gitignored. Nothing else starts until this is true.

### Step-01: rules files `[done]`
`AGENTS.md`, `.cursor/rules/project.mdc` with `alwaysApply: true`.

### Step-02: scaffold `[done]`
Next.js 16 App Router, strict TypeScript, Tailwind 4, `cacheComponents` on. shadcn/ui primitives.
Folder skeleton. `lib/db.ts`, `lib/config.ts`, `lib/format.ts`. `.env.example`. Package scripts.
Placeholder home page.

**Human, by hand:** git init, public GitHub repo, Neon project, Vercel project, environment
variables, first deploy. Open the live URL in an incognito window.

### Step-03: schema `[done]`
Drizzle schema for users, sessions, addresses, categories, products, reviews, cartItems,
wishlistItems, orders, orderItems, contactRequests, viewHistory, productTopics, pricePoints.
Integer pence. Indexes on every foreign key plus the catalogue sort and filter columns, a GIN
index on the search vector, a trigram index on title. `pg_trgm` enabled in the first migration.

Order status is derived, not stored. `lib/order-status.ts` maps order age to PLACED, PACKED,
SHIPPED, OUT_FOR_DELIVERY, DELIVERED, with `cancelledAt` and return state as overrides. Unit
tested at every boundary.

### Step-04: catalogue import `[done]`
Runs unattended alongside Step-02 and the A slices. `scripts/import/` with fetch, transform, load
and topics. Amazon Reviews 2023 dataset, 8 categories, capped at 1,200 products each, 3 or more
reviews required, up to 25 reviews kept per product, reviewer identities not imported. Target
8,000 to 10,000 products. `data/README.md` naming the source and licence.

**Fallback (R12):** a smaller public ecommerce dataset, or 400 generated products in one script
run.

---

## Set A: discovery

### A1: brand and chrome `[done]`
Theme tokens for light and dark in `app/globals.css`, documented in `DESIGN.md`. Two fonts, six-
step scale, tabular numerals. Semantic tokens for price, savings, stock states, rating. SVG
wordmark. App shell: header with search, theme toggle, account menu, wishlist, cart count.
Category strip. Footer with the unaffiliated notice. Mobile sheet at 375px.

### A2: query layer `[done]`
`lib/queries/products.ts`: `getProductCards`, `getFacets`, `getProductBySlug`, `getHomeData`,
`getSuggestions`. `lib/queries/reviews.ts`: `getReviews`, `getRatingHistogram`. All catalogue
reads wrapped in `'use cache'` with a per-category tag and a global `catalogue` tag.

**Performance constraint:** `getHomeData` returns at most 100 product cards in total across all
rails. Unit tests for filter and sort clause building.

### A3: product card and grid `[done]`
`product-card`, `product-card-skeleton` at matching dimensions, `product-grid`, `product-rail`,
`star-rating`, `price`. A `/dev/components` route showing every state including out of stock, no
list price, long title, zero reviews.

### A4: home and category `[done]`
Home with hero, category tiles, deals rail, recently viewed, one rail per category. Everything
below the fold lazy and inside its own Suspense boundary. Category browse at `/c/[...slug]` with
breadcrumb, sidebar, grid, sort, pagination. All filter state in searchParams.

### A5: search `[done]`
Typeahead combobox with full keyboard support, debounced at 150ms. Results page reusing the
sidebar and grid. Applied-filter chip bar. Honest result count. No-results state with suggested
alternatives. `/` focuses search. Playwright test for filter and sort surviving a reload.

**Gate A:** the catalogue is browsable and searchable on the live URL, at full data volume, on a
phone.

---

## Set B: the buying loop

### B1: product detail `[done]`
Gallery, details column with Overview, Specs and Reviews tabs as URL state, sticky purchase
panel. Rating histogram filtering the review list. Related products. `generateMetadata`,
`not-found`, `loading`. View recorded in `viewHistory`.

### B2: cart and wishlist `[done]`
`lib/cart-session.ts` cookie for guests. `lib/pricing.ts` as a pure, unit-tested function.
`lib/queries/cart.ts`, `actions/cart.ts`, `actions/wishlist.ts`. Cart drawer, cart page with
saved for later, free shipping bar. Optimistic updates with rollback and toasts.

### B3: accounts and sessions `[done]`
Hand-rolled email and password. bcrypt, signed JWT via jose in an httpOnly cookie, session rows
in the database. Sign in, sign up, middleware on `/account`, `/orders`, `/checkout`. Demo account
button, seeded with an address and three orders at different ages. Cart merge on sign in with
quantity collision handling. Unit tests for session signing and the merge.

### B4: Stripe checkout `[done]`
One-page checkout with live summary. Address, shipping speed with real computed dates, Stripe
Payment Element. PaymentIntent created from the server-computed total. `placeOrder` re-reads the
PaymentIntent, verifies status and amount, re-checks stock, then in one transaction creates the
order with snapshots, decrements stock, clears the cart. No upsells anywhere. Playwright test
from product page to created order with the test card.

### B5: buy now `[done]`
Single-item checkout context keyed in the session, leaving the real cart untouched. Test that it
does.

**Gate B:** a stranger can arrive at the live URL, search, open a product, pay with the Stripe
test card, and see their order.

---

## Set C: after the sale

### C1: orders and timeline `[pending]`
`lib/queries/orders.ts` with ownership filters. Orders list with status tabs and search. Order
detail doubling as the confirmation, with a timeline built from the derived status. Reorder
action reporting what could not be added. `?demoAge=` in development only.

### C2: cancel and return `[pending]`
Cancel while PLACED or PACKED: Stripe refund, `cancelledAt`, stock restored, all in one
transaction. Return within the window after DELIVERED: item selection, reason, server-computed
refund preview, partial Stripe refund, timeline gains return steps. Outside the window the button
is disabled with a tooltip, not hidden. Unit tests at both window boundaries, Playwright test
that cancel restores stock.

### C3: account `[pending]`
Four tabs as real routes: profile and security, addresses, payment methods, orders. Every read
and write filtered on the session user id. Test that another user's address returns not found.

### C4: reviews and customer service `[pending]`
Reviews restricted to buyers of delivered orders, one per product, enforced in the action.
Helpful votes. Rating aggregates updated in the same transaction. Help page with order shortcuts,
searchable Q&A, and a trackable contact form that promises no reply.

**Gate C:** place an order, cancel one, return another, review a delivered item, raise a contact
request, all on the live URL.

---

## Set D: differentiators

Build in order. Stop when the clock runs out. D1 and D2 are protected, D3 is optional.

### D1: review intelligence `[pending]`
`productTopics` computed at import time from the review corpus against a category-keyed
vocabulary. Topics with 3 or more mentions, capped at 6 per product, sentiment from the mean
rating of mentioning reviews. A data-derived verdict line on each product. Topic pills on the
product page filtering the review list. No model calls at request time.

### D2: honest buy box `[pending]`
90 days of `pricePoints` per product. An honest price line computed from the history, never a
favourable claim when the price is not good. Sparkline popover. Strikethrough list prices and
savings badges shown only when that list price actually appears in the history, suppressed
otherwise. Logged in `DECISIONS.md` and stated in the README.

### D3: compare `[pending]` *(optional)*
Compare checkbox on cards, cookie-backed selection capped at 4, sticky tray, comparison page with
the union of all spec keys, identical rows collapsed by default, best value marked per numeric
row, shareable by URL.

### D4: performance as a measurement `[pending]`
Audit rail counts, cache tags, and every `next/image`. `scripts/load-check.ts` firing 10
concurrent requests across four page types, 5 rounds each, writing a table into
`docs/performance.md`. Run against the deployed URL. Lighthouse mobile on home and a product page.

**Target:** home page full response under 1.5s at 10 concurrent users. Cut rail sizes and rerun
until it is.

**Gate D:** stop building.

---

## Hardening

### H1: audit `[pending]`
Walk every route at 375px, 768px and 1440px, in both themes. Write `AUDIT.md` as a table of
Route, Issue, Severity, Fix. Change no code.

### H2: fix `[pending]`
Every High, and every Medium under five minutes. Route by route, not issue type by issue type.
No new features.

### H3: tests `[pending]`
60 to 80 Vitest units covering pricing boundaries, order status boundaries, return and cancel
eligibility, cart merge, session handling, filter building, review eligibility. 8 to 12 Playwright
end-to-end tests at desktop and 375px covering the full buy loop, cancel, return, guest cart
merge, cross-user access, and theme persistence.

### H4: final sweep `[pending]`
Grep for TODO, FIXME, console.log, placeholder text, emoji. Verify every id-taking query has an
ownership filter. Verify no secret reaches a client bundle. Check `loading.tsx` and `error.tsx`
coverage. Build and report the route table, flagging anything over 200kB first-load JS. Metadata,
favicon, OG image, `lang="en-GB"`.

---

## Submission

### S1: README `[pending]`
Thirteen sections as specified in the plan, ending with the unaffiliated notice. Real performance
numbers, not claims. No badges, no emoji.

### S2: verification `[pending]`
All five commands green. `.agent-logs/` present across many commits. No secrets tracked.
`.env.example` complete. Every route 200 or correctly redirecting for a signed-out visitor. Seed
clean on an empty database.

### S3: human checks `[pending]`
Private window on a fresh device: browse, register, buy, see the order. Same on a phone. Demo
account signs in. Repo loads signed out of GitHub. Vercel on latest `main`.

### S4: walkthrough `[pending]`
Under five minutes, camera on, one rehearsal then record the second take. Script in
`WALKTHROUGH.md`. Say the cuts out loud.
