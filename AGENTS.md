PROJECT
Barrow, a department store web app. A rebuild of Amazon's buyer experience with its own brand and interface, built as a 20-hour technical assessment. Next.js 16 App Router, strict TypeScript, Tailwind 4, Base UI via shadcn, Drizzle, Neon Postgres, Stripe test mode, Vercel.

THE FOUR DOCS
- `roadmap.md` is the slice list and the source of truth for order of work.
- `SPECS.md` says what each slice does and what proves it works.
- `DESIGN.md` is the visual contract: tokens, type scale, spacing, component rules.
- `ARCHITECTURE.md` is the engineering contract: data flow, caching, invariants, directory layout.

HOW WE WORK
- Read `roadmap.md` at the start of every session. Work the single next slice marked pending. Never work two slices in one session. Never add a slice to the roadmap yourself; propose it instead.
- Before coding a slice, read its entry in `SPECS.md`. If there is no entry, write a three-line one and show it before coding.
- End every slice with: `npm run typecheck`, `npm run lint`, `npm run build`, `npm test`. All four pass before you report done.
- At the end of a slice, mark it `[done]` in `roadmap.md` and append a dated one-line entry to `DECISIONS.md` for any choice you made that was not specified.
- Commit and deploy at the end of every slice. Never start a slice with the previous one undeployed.
- `.agent-logs/` goes into the same commit as the slice it belongs to, never batched at the end.

THE FIVE INVARIANTS
These are not preferences. `ARCHITECTURE.md` explains each.
1. Money is integer pence. Never float, never decimal.
2. Totals are computed server side by `lib/pricing.ts`, a pure tested function. The client never supplies an amount.
3. Every read or write touching shopper data takes the session user id and filters on ownership in the query itself. A missing row returns not found, never forbidden.
4. Nothing user-specific is ever cached. `'use cache'` is for catalogue reads only.
5. Order status is derived from order age by `lib/order-status.ts`, not stored and not advanced by a job.

ARCHITECTURE
- Server Components by default. `'use client'` only on small leaf components that need state or events.
- All reads live in `lib/queries/<domain>.ts`. All writes are server actions in `actions/<domain>.ts`. Components never touch the database directly.
- Every action validates with Zod and returns `{ ok: true, data } | { ok: false, error }`. Thrown errors are for bugs; expected failures come back as `ok: false` with a message written for a shopper.
- Queries use explicit column selection. Never return whole rows.
- All tunable values in `lib/config.ts`.
- Three operations need a transaction: place order, cancel order, submit review.

UI
- Follow `DESIGN.md` exactly. Any component inventing its own colour, size, radius or spacing is a bug.
- Base UI primitives in `components/ui/`, domain components grouped in `components/<domain>/`.
- Every list has a loading skeleton matching the real layout, an empty state with a useful action, and an error state with a retry. No spinners except inside a pending button.
- Every page works at 375px. Check before reporting done.
- Keyboard reachable, visible focus ring, alt text, `aria-label` on icon buttons.
- Light and dark themes, both from tokens, both contrast checked.
- Sentence case everywhere. No Title Case, no exclamation marks, no emoji in code or UI.

CODE
- No `any`. No non-null assertions without a comment explaining why.
- No comments restating the code. Comment only non-obvious decisions.
- If a component takes more than six props, split it.
- Never install a package without saying why.

REPORTING
End every session with: the slice completed, files added, files changed, anything you did differently and why, and what the next pending slice is.
