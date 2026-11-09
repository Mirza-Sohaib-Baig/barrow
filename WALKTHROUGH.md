# Walkthrough script

Five minutes, camera on, screen shared. Rehearse once, record the second take, do not edit.

## Before recording

- Site open and signed out in one tab, signed in as the demo account in a second tab
- Cart empty, so the add-to-cart moment is visible
- A product chosen in advance: good variants, 20 or more reviews, a real price history
- An order already placed on the demo account that sits at DELIVERED, so the return flow has
  something to work on
- Browser at default zoom, no bookmarks bar, no other tabs visible
- Notifications off
- Camera framed and lit

## The script

| Time | Screen | What you say | What you click |
| --- | --- | --- | --- |
| 0:00 to 0:20 | You, then home | Who you are. Then the framing: a shop for beauty, handmade goods, music and gifts, rebuilt around the two things Amazon is worst at, trusting what you read and getting out of checkout | Nothing |
| 0:20 to 0:45 | Home | What you built first and why: the buying loop, because a store that cannot sell is not a store. Name the catalogue: real products and real reviews from a public research dataset, so nothing on screen is invented. Name one cut out loud, the seller side | Scroll once, slowly |
| 0:45 to 1:15 | Search | Type a partial query, show typeahead, search, apply two filters, change the sort. Say filters live in the URL so every view is linkable | Type, filter, sort |
| 1:15 to 1:50 | Product page | Gallery, then the specs tab, then the variant picker changing price and image. Say what Amazon gets wrong here: unavailable combinations disappear instead of showing as unavailable | Switch a variant |
| 1:50 to 2:15 | Buy box | **Differentiator one.** The honest price line, then the sparkline. Then the real point: the discount badge is suppressed when the list price never existed in the price history. Say it is a deliberate position, not a missing feature | Open the price popover |
| 2:15 to 2:40 | Reviews | **Differentiator two.** Topic pills, click one, reviews filter. Say the topics are computed at import time from the review corpus, so nothing runs at request time | Click a topic pill |
| 2:40 to 3:00 | Cart | Add to cart, drawer opens, free shipping bar, save for later | Add, open drawer, go to cart |
| 3:00 to 3:40 | Checkout | **Differentiator three.** All four sections on one page. Stripe test card. Order created. Say the number out loud: zero upsells and zero interruptions between cart and confirmation | Address, speed, card, place |
| 3:40 to 4:10 | Orders | The timeline. Then cancel an order and show the refund reference. Then a return request on the delivered one. Say returns are the piece most rebuilds skip | Cancel, then return |
| 4:10 to 4:35 | README | The measured performance table. Say the concurrency and the method, not just the number | Scroll to the table |
| 4:35 to 4:50 | Repo | `roadmap.md` with slices ticked off, and `.agent-logs/` across the commit history. Two sentences on the method | Open both |
| 4:50 to 5:00 | You | What you would build next, and one thing you would change about your own approach | Nothing |

## Three rules while recording

**Say the cuts out loud.** Product judgement is a scored criterion and the only way anyone hears
your reasoning is if you say it. "I did not build the seller portal because it is a second
product with its own auth model and adds nothing to a buyer demo" takes six seconds.

**Never apologise for scope.** Not "I didn't have time to". Instead "I chose to spend that time
on". Same fact, completely different signal.

**Do not narrate clicks.** Nobody needs to hear "and now I'm clicking add to cart". Use that
time for why instead of what.

## If you are running long

Cut in this order: the repo section, then the search demo, then the home page scroll. Never cut
the checkout or the honest buy box. Do not speed up your speech to fit.
