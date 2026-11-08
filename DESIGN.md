# Barrow design system

The visual contract for the whole app. Any component that invents its own colour, size or
spacing is a bug.

## The idea

Barrow is a department store, not a marketplace. The feeling to aim for is a well-run shop
floor: warm, quiet, confident, nothing shouting. Amazon's interface competes with itself for
attention, and most of what it shows is trying to sell you something other than the thing you
are looking at. Barrow shows you the thing you are looking at.

Three consequences that should be visible in every screen:

- **Warm paper, not grey.** Surfaces carry a slight warmth so the page reads as printed matter
  rather than as a dashboard.
- **One accent, used sparingly.** Ink indigo, on primary actions and nothing else. If everything
  is emphasised, nothing is.
- **Prices are quiet.** A price is information, not an advertisement. It is set in the body
  colour at a confident size, with savings shown in green only where the saving is real.

## Colour

Tailwind 4 and Base UI both work in oklch, so the tokens are authored in oklch. Hue is held
constant inside each family so the scale stays coherent when lightness moves.

Two hue anchors. Neutrals sit at hue 80, which is a warm sand. The accent sits at hue 275,
a cool ink indigo. Warm surface against a cool accent is what stops it looking like a default
template.

### Light

```css
:root {
  --background:            oklch(0.985 0.006 85);
  --foreground:            oklch(0.220 0.015 60);

  --card:                  oklch(1 0 0);
  --card-foreground:       oklch(0.220 0.015 60);

  --popover:               oklch(1 0 0);
  --popover-foreground:    oklch(0.220 0.015 60);

  --muted:                 oklch(0.955 0.008 85);
  --muted-foreground:      oklch(0.505 0.012 70);

  --accent:                oklch(0.955 0.008 85);
  --accent-foreground:     oklch(0.220 0.015 60);

  --primary:               oklch(0.420 0.130 275);
  --primary-foreground:    oklch(0.990 0.004 85);

  --secondary:             oklch(0.945 0.010 85);
  --secondary-foreground:  oklch(0.270 0.015 60);

  --destructive:           oklch(0.520 0.190 25);
  --destructive-foreground:oklch(0.990 0.004 85);

  --border:                oklch(0.900 0.009 80);
  --input:                 oklch(0.900 0.009 80);
  --ring:                  oklch(0.420 0.130 275);

  /* Commerce semantics. Never hardcode these anywhere. */
  --color-price:           oklch(0.250 0.020 60);
  --color-savings:         oklch(0.480 0.140 150);
  --color-in-stock:        oklch(0.480 0.140 150);
  --color-low-stock:       oklch(0.560 0.140 70);
  --color-out-of-stock:    oklch(0.550 0.015 60);
  --color-rating:          oklch(0.700 0.145 75);

  --radius: 0.625rem;
}
```

### Dark

Not an inversion. The dark surface keeps the same warmth so the brand survives the switch, and
the accent lifts in lightness because a 0.42 indigo is unreadable on a dark ground.

```css
.dark {
  --background:            oklch(0.190 0.012 70);
  --foreground:            oklch(0.950 0.006 85);

  --card:                  oklch(0.235 0.012 70);
  --card-foreground:       oklch(0.950 0.006 85);

  --popover:               oklch(0.235 0.012 70);
  --popover-foreground:    oklch(0.950 0.006 85);

  --muted:                 oklch(0.270 0.012 70);
  --muted-foreground:      oklch(0.700 0.012 80);

  --accent:                oklch(0.280 0.014 70);
  --accent-foreground:     oklch(0.950 0.006 85);

  --primary:               oklch(0.715 0.125 275);
  --primary-foreground:    oklch(0.185 0.015 275);

  --secondary:             oklch(0.280 0.014 70);
  --secondary-foreground:  oklch(0.950 0.006 85);

  --destructive:           oklch(0.640 0.170 25);
  --destructive-foreground:oklch(0.185 0.012 25);

  --border:                oklch(0.320 0.012 70);
  --input:                 oklch(0.320 0.012 70);
  --ring:                  oklch(0.715 0.125 275);

  --color-price:           oklch(0.960 0.006 85);
  --color-savings:         oklch(0.700 0.140 150);
  --color-in-stock:        oklch(0.700 0.140 150);
  --color-low-stock:       oklch(0.760 0.130 70);
  --color-out-of-stock:    oklch(0.620 0.012 70);
  --color-rating:          oklch(0.780 0.140 75);
}
```

### Contrast

Every pair below must clear WCAG AA. These are the ones that actually get checked in the audit,
because they are the ones that fail in practice:

| Pair | Minimum |
| --- | --- |
| `--foreground` on `--background` | 4.5:1 |
| `--muted-foreground` on `--background` | 4.5:1 |
| `--muted-foreground` on `--card` | 4.5:1 |
| `--primary-foreground` on `--primary` | 4.5:1 |
| `--color-low-stock` on `--card` | 4.5:1 |
| `--ring` against adjacent surface | 3:1 |

Check both themes. The usual failure is muted text on a muted surface in dark mode.

### Where each colour is allowed

- `--primary` is for primary buttons, the focus ring, and the active state of a control. Nothing
  else. Not headings, not links in body text, not icons.
- `--color-savings` appears only when there is a verified saving. See the honest buy box rule.
- `--color-rating` is the filled portion of a star only.
- `--destructive` is for destructive confirmation and error messages. Never for a price, never
  for a sale badge.

## Typography

Two faces, both loaded through `next/font/google` with `display: "swap"`.

**Fraunces** for headings. A variable serif with real character, which is what stops the page
reading as a template. Use optical sizing, weight 600, and the `SOFT` axis at 0 for a crisper
cut at large sizes.

**Geist Sans** for everything else. Already present through the shadcn base-nova preset.
Highly legible at small sizes, and its figures are good.

```ts
import { Fraunces, Geist } from "next/font/google";

export const display = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  axes: ["SOFT", "WONK"],
});

export const body = Geist({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});
```

### Scale

Six steps, no more. If a size is not on this list it does not exist.

| Token | Size / line height | Face | Weight | Used for |
| --- | --- | --- | --- | --- |
| `text-display` | 2.5rem / 1.1 | Fraunces | 600 | Hero only, one per page at most |
| `text-h1` | 2rem / 1.15 | Fraunces | 600 | Page title |
| `text-h2` | 1.5rem / 1.2 | Fraunces | 600 | Section heading, rail title |
| `text-h3` | 1.125rem / 1.3 | Geist | 600 | Card title, panel heading |
| `text-body` | 0.9375rem / 1.55 | Geist | 400 | Everything |
| `text-small` | 0.8125rem / 1.45 | Geist | 400 | Metadata, captions, helper text |

Below `text-small` nothing is legible enough to be worth showing, so there is no smaller step.
If something needs to be smaller, it needs to be cut instead.

### Numbers

Every price, quantity, rating and order total uses `font-variant-numeric: tabular-nums`. Set it
once on a `.tnum` utility and apply it in `price.tsx`, the order summary and every table. Without
it, columns of prices wobble and the whole thing looks amateur.

Prices render as a single string from `formatPrice`, never as separate pound and pence spans.
The split-superscript-pence pattern is an Amazon tic that makes prices harder to scan.

## Spacing

4px base. The only values in use:

```
4  8  12  16  24  32  48  64  96
```

Rules that matter more than the scale itself:

- Inside a card, 16. Between cards in a grid, 16. Between sections, 48.
- A page's outer gutter is 16 at mobile, 24 at tablet, 32 at desktop, with content capped at
  1280px.
- Vertical rhythm beats horizontal fiddling. If a layout feels wrong, the gap above or below is
  usually the problem, not the width.

## Shape and depth

**Radius: one value, 10px**, via `--radius`. Buttons, cards, inputs, images, badges. A badge may
be fully rounded when it is a pill. Nothing else deviates.

**Two shadow levels, and that is all.**

```css
--shadow-raise: 0 1px 2px oklch(0.2 0.02 60 / 0.06),
                0 1px 1px oklch(0.2 0.02 60 / 0.04);
--shadow-float: 0 8px 24px oklch(0.2 0.02 60 / 0.10),
                0 2px 6px  oklch(0.2 0.02 60 / 0.06);
```

`raise` is for a card lifting on hover. `float` is for popovers, dropdowns, the cart drawer and
dialogs. Resting cards have a border, not a shadow. Shadows on everything is the fastest way to
look like a 2016 dashboard.

In dark mode, `--shadow-raise` is removed and separation comes from `--border` and the lighter `--card`. `--shadow-float` stays as `0 8px 24px oklch(0 0 0 / 0.4)` so menus and sheets still lift off the page.

## Motion

Short, and only where it explains something.

| Thing | Duration | Easing |
| --- | --- | --- |
| Hover, focus, colour | 120ms | `ease-out` |
| Dropdown, popover, tooltip | 150ms | `ease-out` |
| Drawer, sheet, dialog | 220ms | `cubic-bezier(0.32, 0.72, 0, 1)` |
| Skeleton shimmer | 1.4s loop | `linear` |

Nothing animates on page load. No parallax, no scroll-triggered reveals, no number counters.
Every one of these is wrapped so that `prefers-reduced-motion: reduce` collapses it to an
instant state change.

## Components

### Buttons

Four variants, and resist adding a fifth.

| Variant | Appearance | Used for |
| --- | --- | --- |
| `primary` | Filled `--primary` | Add to cart, Place order, Sign in. One per view |
| `secondary` | Filled `--secondary` | Buy now, Save for later, secondary actions |
| `outline` | Border, transparent fill | Filters, toolbar controls |
| `ghost` | No border, no fill | Icon buttons, tertiary links |

Heights: 40px default, 44px for the main purchase action, 32px for compact toolbar use. Every
icon-only button is 40x40 minimum, because a 32px tap target fails on a phone.

A button that triggers a server action always shows a pending state, always disables itself
while pending, and never shifts width when its label changes. Reserve the width.

### Product card

The single most repeated element in the app, so it gets specified rather than improvised.

- Square image, 1:1, on `--muted` so a transparent PNG still reads
- Title at `text-h3`, clamped to two lines, fixed two-line height so the grid never jags
- Star row at `text-small`, rating colour for the stars, muted for the count
- Price at `text-h3` in `--color-price`, any previous price struck through in muted beside it,
  savings badge only when verified
- Stock line only when it says something: "Only 2 left" in low-stock colour, or "Out of stock"
  in muted. Nothing when stock is healthy, because "In stock" on every card is noise
- Resting state has a border and no shadow. Hover raises it with `--shadow-raise` and nothing
  else, no scale, no lift transform

The whole card is one link. The wishlist and compare controls are buttons layered above it, not
nested inside the anchor.

### Forms

Labels above the field, always visible. No placeholder-as-label, ever. Helper text below in
muted. Errors below in destructive with `role="alert"`, and the field gets `aria-describedby`
pointing at both.

Validate on blur, not on every keystroke. Re-validate on change only after the field has already
errored once.

### Empty, loading and error states

Each one is a real piece of design, not an afterthought.

- **Loading** is a skeleton that matches the real layout's dimensions exactly. No spinners
  anywhere in the app except inside a pending button.
- **Empty** states say what is missing, why it might be missing, and offer one action that fixes
  it. "No results for *blue running shoes*. Try removing the £20 to £40 filter." beats "No
  results found."
- **Error** states say what failed and offer a retry. Never show a stack trace, never show
  "Something went wrong" with no action.

## Responsive

Three breakpoints, and the app is designed mobile first.

| Width | Layout |
| --- | --- |
| 375 to 767 | Single column. Grid at 2 columns. Filters in a sheet. Buy actions in a sticky bottom bar |
| 768 to 1023 | Grid at 3 columns. Filters still in a sheet. Product page stacks |
| 1024+ | Grid at 4 then 5 columns. Filter sidebar inline. Product page is gallery, details, sticky panel |

375px is the test width, not 390. If it works at 375 it works everywhere.

## Accessibility

Not a phase, a constraint on every component.

- Focus ring is 2px of `--ring` with a 2px offset, on every interactive element. `outline: none`
  without a replacement is a bug.
- One `h1` per page. No skipped levels.
- Icon-only buttons carry `aria-label`. Decorative images carry `alt=""`. Product images carry
  the product title.
- Dialogs, sheets and the cart drawer trap focus, close on Escape, and return focus to whatever
  opened them.
- The search field is a proper combobox with `aria-expanded`, `aria-controls` and
  `aria-activedescendant`. Arrow keys move, Enter selects, Escape closes.
- Toasts live in a polite live region.
- Colour never carries meaning alone. Stock state has words, not just a colour. Savings have a
  number, not just green.

## Writing

The interface voice is plain, specific and British.

- Sentence case for every heading, button and label. No Title Case.
- "Add to basket" is more honest for a UK store, but "Add to cart" is what the codebase uses
  throughout, so stay with cart for consistency. Pick once, never mix.
- Numbers are specific. "Arrives Thursday 13 November" beats "Fast delivery".
- No exclamation marks. No "Oops". No emoji anywhere in the product.
- Error messages name the thing that failed and what to do: "That card was declined. Try another
  card or check the details."

## The things that would make this look generic

Worth keeping visible, because under time pressure these are exactly what creeps in.

1. Pure grey surfaces instead of warm ones
2. Shadows on resting cards
3. More than one accent colour
4. Mixed border radii
5. A spinner where a skeleton belongs
6. Title Case headings
7. Placeholder text standing in for labels
8. Prices in different sizes on the same screen
9. Hover effects that move things
10. An empty state that just says "Nothing here"
