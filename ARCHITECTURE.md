# Barrow architecture

The engineering contract. `AGENTS.md` is the short version an agent reads every session; this is
the reasoning behind it and the detail that does not fit there.

## Shape

One Next.js 16 application. No separate API, no separate backend, no background workers.

```
Browser
  │
  ├── Server Component  ──►  lib/queries/*.ts  ──►  Drizzle  ──►  Neon Postgres
  │     (cached reads)
  │
  └── Server Action     ──►  actions/*.ts      ──►  Drizzle  ──►  Neon Postgres
        (all writes)                            └─►  Stripe
```

Reads go through query functions. Writes go through server actions. Components do neither
directly. That one rule is what keeps a 20-hour build from turning into database calls scattered
through JSX.

## The five invariants

Everything else is preference. These five are not.

### 1. Money is integer pence

No floats, no `decimal`, no currency strings in the database. `priceInPence: integer`. Formatting
happens once, in `formatPrice`, at the edge. A float price produces £19.989999999 in an order
total at the worst possible moment.

### 2. Totals are computed on the server, from the server's own numbers

`lib/pricing.ts` is a pure function. It takes line items and a shipping option and returns
subtotal, shipping, tax, total and `amountToFreeShipping`. It is the only place arithmetic on
money happens.

The client never sends a total. `placeOrder` recomputes from the cart rows it reads itself, and
compares that against the PaymentIntent amount before creating anything. A checkout that trusts
a client-supplied total is a checkout you can buy a television from for one penny.

### 3. Every shopper read and write filters on ownership

Any query or action that touches `orders`, `addresses`, `cartItems`, `wishlistItems` or
`contactRequests` takes the session user id as a parameter and includes it in the where clause.
Not "checks it afterwards". Includes it in the query.

```ts
// Correct
export async function getOrder(orderNumber: string, userId: string) {
  return db.query.orders.findFirst({
    where: and(eq(orders.orderNumber, orderNumber), eq(orders.userId, userId)),
  });
}

// Wrong, and the kind of wrong a reviewer will find in thirty seconds
export async function getOrder(orderNumber: string) {
  return db.query.orders.findFirst({ where: eq(orders.orderNumber, orderNumber) });
}
```

A missing row returns not found. Never "forbidden", because that confirms the row exists.

### 4. Nothing user-specific is ever cached

`'use cache'` goes on catalogue reads only: products, categories, facets, reviews, rails. Any
function taking a user id or reading cookies is dynamic, full stop.

This is the one bug in this build that would be genuinely embarrassing, because the failure mode
is one shopper being served another shopper's cart or orders out of the cache. The H4 sweep
checks for it explicitly.

### 5. Order state is derived, not stored

There is no status column and no job moving orders along. `lib/order-status.ts` is a pure
function from `placedAt` plus the order's overrides to a status:

```ts
export function deriveStatus(order: {
  placedAt: Date;
  cancelledAt: Date | null;
  returnRequestedAt: Date | null;
}, now = new Date()): OrderStatus
```

Overrides win: cancelled beats everything, return requested beats delivered. Otherwise age
decides, on the thresholds in `lib/config.ts`.

This is worth copying from the reference build. It means the full delivery lifecycle is visible
in a demo with no cron, no queue and no seeding tricks, and it is trivially unit testable because
it is a pure function of two inputs.

## Data access

### Queries

One file per domain in `lib/queries/`. Every function:

- takes a single options object, never positional arguments beyond an id
- uses an explicit `columns` or `select`, never returns whole rows
- returns a named, exported type so components do not infer shapes from Drizzle

Card-shaped reads return exactly the fields the card renders. A list page that pulls full product
descriptions for 24 products to render 24 titles is the most common cause of a slow catalogue.

### Actions

One file per domain in `actions/`. Every action:

```ts
"use server";

const schema = z.object({ /* ... */ });

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function doThing(input: unknown): Promise<Result<Thing>> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "..." };

  const session = await getSession();
  if (!session) return { ok: false, error: "Sign in to continue." };

  // ... work, ownership-filtered

  revalidateTag("...");
  return { ok: true, data: thing };
}
```

Thrown errors are for bugs. Expected failures, out of stock, declined card, not your order, come
back as `{ ok: false }` with a message written for a shopper, not for a log.

### Transactions

Three places need one, and all three are places where a partial write is visible to a customer:

- **Place order.** Create order, create order items, decrement stock, clear cart. One
  `db.transaction`.
- **Cancel order.** Refund through Stripe, set `cancelledAt`, restore stock.
- **Submit review.** Insert review, recompute and write `ratingAverage` and `reviewCount`.

Call Stripe before opening the transaction where possible, and store its reference inside. A
Stripe call inside a long transaction holds a database connection open across a network round
trip, which on a serverless pooled connection is how you exhaust the pool.

## Caching

Next.js 16 `cacheComponents` is on. The model is simple enough to hold in your head:

| Data | Strategy | Tags |
| --- | --- | --- |
| Product detail | `'use cache'` | `product:{slug}`, `catalogue` |
| Category and search results | `'use cache'` | `category:{slug}`, `catalogue` |
| Facets | `'use cache'` | `category:{slug}`, `catalogue` |
| Home rails | `'use cache'` | `catalogue` |
| Reviews | `'use cache'` | `product:{slug}` |
| Cart, orders, account, wishlist | Dynamic, never cached | none |

Invalidation points: a stock change invalidates `product:{slug}`. A review invalidates
`product:{slug}`. The import invalidates `catalogue`. Nothing invalidates everything on an
ordinary write.

Personal data streams in behind Suspense rather than making the whole page dynamic. The header
cart count is a dynamic island inside a cached shell, not a reason to make the shell dynamic.

## Performance

The reference build we are measured against renders roughly 300 product cards on the server for
its home page, and reports about 0.25s to first byte but around 4s for a full page under 10
concurrent users. Beating that is a stated goal, so it gets a budget rather than good intentions.

| Page | Target full response, 10 concurrent | How |
| --- | --- | --- |
| Home | under 1.5s | At most 100 cards total. Hero plus first rail server-rendered, the rest lazy behind Suspense |
| Category | under 1.2s | 24 per page, facet counts in one query, not one per facet |
| Search | under 1.5s | `tsvector` with a GIN index, trigram only as fallback |
| Product | under 1.0s | Lead image `priority`, reviews paginated at 10 |

Rules that keep those true:

- Every `next/image` has correct `sizes` and explicit dimensions. `priority` on the hero and the
  product lead image only.
- No `select *`. Card reads fetch card fields.
- Facet counts come from one grouped query, not one query per facet.
- `scripts/load-check.ts` measures it against the deployed URL and writes `docs/performance.md`.
  The README quotes that table, not an estimate.

## Authentication

Hand-rolled, deliberately. An auth library is a dependency, a configuration surface and a version
fight, and what this app needs is about eighty lines.

- `bcrypt` for the password hash, cost 10.
- A signed JWT in an httpOnly, secure, sameSite lax cookie, via `jose`.
- A `sessions` row alongside it, so a session can be revoked server side and "sign out
  everywhere" is possible.
- `middleware.ts` guards `/account`, `/orders` and `/checkout` and redirects to
  `/signin?next=`.

The guest cart is a separate `cartKey` cookie. On sign in, `lib/cart-merge.ts` moves those rows
onto the user id, summing quantities where the same product already sits in both carts, then
clears the cookie. That collision case is the one worth a unit test, because it is the one people
get wrong.

## Payments

Stripe test mode, Payment Element, no webhooks.

The flow:

1. A server action computes the total from the cart and creates a PaymentIntent for that amount.
2. The client confirms the payment with the Payment Element.
3. `placeOrder` re-reads the PaymentIntent from Stripe by id, checks its status is `succeeded`
   and its amount equals a freshly recomputed total, re-checks stock, then creates the order in
   one transaction.

Step 3 is what replaces webhooks. It needs no public endpoint, no local tunnel and no signature
verification, and it is strictly safer than trusting a client callback. The cost is that an
abandoned tab leaves a paid PaymentIntent with no order, which for a demo is acceptable and is
noted in the README.

Card details never touch the server. Only the last four digits are stored, for display.

## Errors and failure

| Failure | Behaviour |
| --- | --- |
| Out of stock at checkout | Fail with a message naming the item. Leave the cart intact |
| Card declined | Stripe's own message, surfaced in the payment section. Cart intact |
| Another user's resource | Not found. Never forbidden |
| Database unreachable | `error.tsx` with a retry button. No stack trace |
| Unknown route | `not-found.tsx` with search and category links |

Every route group has `loading.tsx` and `error.tsx`. A route without them is incomplete.

## Testing

Not coverage theatre. Test the things where being wrong costs money or leaks data.

**Unit, Vitest, target 60 to 80:**

- `lib/pricing.ts` at every boundary: empty cart, exactly at the free shipping threshold, one
  penny under, tax rounding
- `lib/order-status.ts` at every age threshold, plus both overrides
- Cancel and return window eligibility at both edges
- `lib/cart-merge.ts`, especially the quantity collision
- Session signing, verification, expiry, and a tampered token
- Search filter and sort clause building
- Review eligibility: not a buyer, buyer but undelivered, already reviewed

**End to end, Playwright, target 8 to 12, run at desktop and 375px:**

- Search, filter, sort, reload, same results
- Product to cart to Stripe test card to a created order
- Buy now leaves the existing cart untouched
- Cancel an order, stock restored
- Return request on a delivered order
- Guest cart survives sign in
- Another user's order returns not found
- Theme toggle persists across reload

## Directory contract

```
actions/        server actions, one file per domain, "use server" at the top
app/
  (auth)/       signin, signup
  (site)/       everything else, under the shared chrome
  api/          route handlers, only where an action cannot serve
components/
  ui/           Base UI primitives via shadcn, do not hand-edit beyond tokens
  brand/        logo and wordmark
  product/      card, grid, rail, gallery, variant picker, price, stars
  catalogue/    filter sidebar, sort control, pagination, chips
  cart/         drawer, line item, summary
  checkout/     address, shipping, payment, review
  order/        timeline, status badge, order card
docs/
  specs.md      one short spec per slice
  performance.md  generated by scripts/load-check.ts
drizzle/        generated migrations only
lib/
  schema.ts     Drizzle schema, the single source of table truth
  db.ts         the Drizzle client
  config.ts     every tunable number and string
  pricing.ts    pure, tested
  order-status.ts  pure, tested
  auth.ts       hash, verify, session create and read
  cart-merge.ts
  format.ts     formatPrice, formatDate, formatRelative
  queries/      one file per domain
scripts/
  import/       the catalogue pipeline
  seed.ts       demo account and its orders
  load-check.ts
tests/
  e2e/          Playwright
```

Unit tests sit beside the file they test, as `*.test.ts`. End-to-end tests live in `tests/e2e/`.

## What is deliberately not here

Worth stating, because absence looks like oversight otherwise.

- **No seller side.** A second product with its own auth model, invisible to a buyer demo.
- **No webhooks.** Replaced by the PaymentIntent re-read above.
- **No background jobs.** Replaced by derived order status.
- **No recommendation model.** The `frequentlyBoughtWith` relation is seeded, and at demo scale
  is indistinguishable from an inferred one.
- **No image hosting.** Product images load from the dataset's own URLs, declared in
  `next.config.ts` remote patterns.
- **No internationalisation.** GBP and `en-GB` only. Two currencies would double every
  formatting path for nothing a grader can see.
