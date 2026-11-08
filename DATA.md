# Catalogue data

How the products and reviews get into Barrow, and why it is done this way.

## The constraint that shaped this

The Amazon Reviews 2023 dataset from the McAuley Lab at UC San Diego is the right source: real
products, real reviews, real ratings, publicly available for research. But it is 571 million
reviews across 33 categories, and the large categories are unusable under a time limit. The
Home and Kitchen review file alone is 31 GB.

The Hugging Face dataset viewer is disabled for the repository, and `is-valid` reports no
preview, no viewer, no search and no filter, so there is no rows API to pull slices from
either. The only routes in are the parquet-converted configs on Hugging Face and the plain
gzipped JSONL files on the lab's own server.

So the catalogue is built from **whole categories that are small enough to take whole**. Every
product is joined to its own real reviews on `parent_asin`. Nothing is re-associated, nothing is
generated, nothing is approximated.

## The categories

Download sizes are the dataset's own published figures for the metadata files.

| Category | Meta download | Items | Tier |
| --- | --- | --- | --- |
| `All_Beauty` | 59.6 MB | 112,590 | Core |
| `Handmade_Products` | 132 MB | 164,817 | Core |
| `Musical_Instruments` | 230 MB | 213,593 | Core |
| `Gift_Cards` | 0.4 MB | 1,137 | Core, tiny but it rounds out the store |
| `Arts_Crafts_and_Sewing` | 807 MB | 801,446 | Add if bandwidth allows |
| `Toys_and_Games` | 973 MB | 890,874 | Add if bandwidth allows |

Start with the four core categories, about 420 MB of metadata. Add the other two only if the
first four land quickly. Anything above roughly 1 GB per file is not worth the clock.

Do not touch Electronics, Cell Phones, Books, Clothing or Home and Kitchen. Their review files
run to tens of gigabytes.

**This changes the positioning slightly.** Barrow is not a general department store, it is a
shop for beauty, craft, music and gifts. That is a better story anyway, because a focused
retailer justifies a calm interface in a way a hypermarket does not. Update the README line and
the walkthrough opener to match.

## Where the files come from

Two sources, both public, no account and no token needed.

**Metadata**, per category:
```
https://datarepo.eng.ucsd.edu/mcauley_group/data/amazon_2023/raw/meta_categories/meta_<Category>.jsonl.gz
```

**Reviews**, per category:
```
https://datarepo.eng.ucsd.edu/mcauley_group/data/amazon_2023/raw/review_categories/<Category>.jsonl.gz
```

Note the naming difference: metadata files carry a `meta_` prefix, review files do not.

Check the size before committing to a download:
```powershell
curl.exe -sI "https://datarepo.eng.ucsd.edu/mcauley_group/data/amazon_2023/raw/review_categories/All_Beauty.jsonl.gz" | Select-String -Pattern "content-length"
```

If any review file comes back over about 800 MB, drop that category rather than waiting for it.

## Fields available

Metadata rows carry: `parent_asin`, `title`, `average_rating`, `rating_number`, `features` as a
string array, `description` as a string array, `price` as a string, `images` with `hi_res`,
`large`, `thumb` and `variant` URLs, `store`, `categories` as a string array, `details` as a
JSON string, `main_category`, `bought_together`, `subtitle`, `author`.

Review rows carry: `rating`, `title`, `text`, `images`, `asin`, `parent_asin`, `user_id`,
`timestamp`, `helpful_vote`, `verified_purchase`.

The join key is `parent_asin` on both sides. Products with different colours, sizes or styles
share a parent, which is also how variants get derived.

## Step-04, the import prompt

```markdown
Read `AGENTS.md`, `DATA.md`, `drizzle/schema.ts` and `lib/config.ts`. Slice Step-04.

Build the catalogue import. This runs once, locally, against the Neon database. It is not part
of the app build and nothing in `app/` imports from it.

Create `scripts/import/` with these files.

`categories.ts`
Exports the category list to import, each entry naming the dataset category, the display name,
the slug, and three subcategory names we will map onto. Start with:
- All_Beauty          -> "Beauty"          subcategories: Skincare, Haircare, Fragrance
- Handmade_Products   -> "Handmade"        subcategories: Jewellery, Home, Gifts
- Musical_Instruments -> "Music"           subcategories: Guitars, Keys, Studio
- Gift_Cards          -> "Gift cards"      subcategories: Experiences, Retail, Occasions
Make the list the single place a category is added or removed.

`fetch.ts`
Downloads, per category, both files into `data/raw/`, skipping any file already present:
- meta: https://datarepo.eng.ucsd.edu/mcauley_group/data/amazon_2023/raw/meta_categories/meta_<Category>.jsonl.gz
- reviews: https://datarepo.eng.ucsd.edu/mcauley_group/data/amazon_2023/raw/review_categories/<Category>.jsonl.gz
Stream to disk with a progress line showing bytes against content-length. Never buffer a whole
file in memory. Fail loudly with the URL if a download 404s.

`transform.ts`
Reads each pair with a gunzip stream and a line reader, never `JSON.parse` on a whole file.

Pass one, reviews: build a map of parent_asin to its reviews. Keep rating, title, text,
timestamp, helpful_vote, verified_purchase. Discard a review with an empty body or a body over
2,000 characters. Cap at 25 reviews per product, preferring the highest helpful_vote. Discard
reviewer identity entirely: never carry user_id through, and generate a display name instead.

Pass two, products. Keep a product only if all of these hold:
- it has at least one usable image URL, preferring hi_res then large
- `price` parses to a number greater than zero, after stripping a currency symbol and commas.
  Discard anything that does not parse. Never default to zero
- `title` is between 10 and 160 characters
- it has 3 or more reviews in the map from pass one

Then cap each category at 1,200 products, choosing those with the most reviews so the catalogue
is dense rather than sparse.

Per product, derive:
- `slug` from the title plus a short hash of parent_asin. Guarantee uniqueness
- `priceInPence` as an integer. The dataset prices are US dollars; treat them as pounds rather
  than converting, and say so in `data/README.md`
- `listPriceInPence` for roughly a third of products, 10 to 40 percent above the price, chosen
  deterministically from the parent_asin hash so reruns are stable
- `bullets` from `features`, first 5, each trimmed and under 200 characters
- `specs` from `details` parsed as JSON, keeping at most 12 keys, dropping empty values
- `brand` from `store`, cleaned of trailing format noise like "Format: Audio CD"
- `stock` deterministic from the hash: about 5 percent at 0, about 10 percent between 1 and 3,
  the rest between 10 and 200
- subcategory assigned by keyword match against the title and `categories`, falling back to the
  first subcategory

`load.ts`
Inserts with Drizzle in batches of 1,000, a transaction per batch. Order: categories, then
products, then reviews. Then in a second pass compute and write `ratingAverage` and
`reviewCount` per product from the reviews actually inserted, not from the dataset's own
`average_rating`, so the histogram and the average always agree. Then populate the search
vectors.

`index.ts`
Chains fetch, transform and load, takes `--limit <n>` for quick test runs and `--only
<category>` for one category, logs progress per stage, and prints final row counts per table
and per category.

Also write `data/README.md` naming the dataset, its citation, the lab, the licence, the
categories imported, the row counts, and a plain statement that reviewer identities were not
imported and that prices are treated as pounds.

Add `data/raw/` to `.gitignore` if it is not there already.

Target: 3,000 to 4,000 products and 40,000 to 80,000 reviews across four categories. Report the
counts. Then mark Step-04 done in `roadmap.md` and run the four checks.
```

## After it runs

Add the image hosts to `next.config.ts` remote patterns. The dataset's images are served from
`m.media-amazon.com`. They are hotlinked rather than re-hosted, which is the correct call under
a time limit and is recorded in `DECISIONS.md`.

## Fallback

If the downloads are slow or the files fight you, give it 45 minutes, then fall back to
`milistu/AMAZON-Products-2023` on Hugging Face. It is 117,243 products derived from the same
source, it has a working dataset viewer, and it carries title, description, features, details,
image, price, store, and the real `average_rating` and `rating_number`. Its `embeddings` column
is a 1536-float vector that breaks the rows API, so load it through the `datasets` library and
drop that column.

That path gives you real products and real aggregate ratings but no joined review text, so
record the gap honestly in the README rather than filling it with generated prose.
