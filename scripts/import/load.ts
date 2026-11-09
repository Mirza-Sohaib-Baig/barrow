import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { neonConfig, Pool } from "@neondatabase/serverless";
import { sql, isNotNull } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { categories, products, reviews } from "@/drizzle/schema";
import { childSlug, type ImportCategory } from "./categories";
import type { ProductDraft } from "./transform";

neonConfig.webSocketConstructor = WebSocket;

export type LoadReport = {
  categories: number;
  products: number;
  reviews: number;
  ratingMismatches: number;
  perCategory: { name: string; products: number; reviews: number }[];
};

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  imageUrl: string | null;
  sortOrder: number;
};

function categoryRows(list: readonly ImportCategory[]): { rows: CategoryRow[]; childIds: Map<string, string> } {
  const rows: CategoryRow[] = [];
  const childIds = new Map<string, string>();
  list.forEach((category, index) => {
    const parentId = randomUUID();
    rows.push({
      id: parentId,
      name: category.name,
      slug: category.slug,
      parentId: null,
      imageUrl: null,
      sortOrder: index,
    });
    category.subcategories.forEach((subcategory, childIndex) => {
      const id = randomUUID();
      const slug = childSlug(category, subcategory);
      childIds.set(slug, id);
      rows.push({
        id,
        name: subcategory.name,
        slug,
        parentId,
        imageUrl: null,
        sortOrder: childIndex,
      });
    });
  });
  return { rows, childIds };
}

function chunks<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }
  return batches;
}

function causeMessage(error: unknown): string {
  if (error instanceof Error && error.cause instanceof Error) return error.cause.message;
  if (error instanceof Error) return error.message.slice(0, 240);
  return "insert failed";
}

export async function loadCatalogue(
  groups: { category: ImportCategory; products: ProductDraft[] }[],
  batchSize: number,
): Promise<LoadReport> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");

  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle({ client: pool, schema: { categories, products, reviews } });

  try {
    const { rows, childIds } = categoryRows(groups.map((group) => group.category));
    const drafts = groups.flatMap((group) => group.products);
    const productIds = new Map<string, string>();

    await db.transaction(async (tx) => {
      await tx.delete(products);
      await tx.delete(categories).where(isNotNull(categories.parentId));
      await tx.delete(categories);
    });

    await db.transaction(async (tx) => {
      const parents = rows.filter((row) => row.parentId === null);
      const children = rows.filter((row) => row.parentId !== null);
      if (parents.length > 0) await tx.insert(categories).values(parents);
      if (children.length > 0) await tx.insert(categories).values(children);
    });

    const productRows = drafts.map((draft) => {
      const categoryId = childIds.get(draft.subcategorySlug);
      if (!categoryId) throw new Error(`Missing subcategory ${draft.subcategorySlug}`);
      const id = randomUUID();
      productIds.set(draft.slug, id);
      return {
        id,
        title: draft.title,
        slug: draft.slug,
        description: draft.description,
        bullets: draft.bullets,
        specs: draft.specs,
        categoryId,
        brand: draft.brand,
        priceInPence: draft.priceInPence,
        listPriceInPence: draft.listPriceInPence,
        ratingAverage: 0,
        reviewCount: 0,
        stock: draft.stock,
        imageUrls: draft.imageUrls,
      };
    });

    async function insertProductBatch(batch: typeof productRows): Promise<void> {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(products).values(batch);
        });
      } catch (error) {
        if (batch.length <= 1) {
          throw new Error(`product ${batch[0]?.slug ?? "unknown"}: ${causeMessage(error)}`);
        }
        const mid = Math.ceil(batch.length / 2);
        await insertProductBatch(batch.slice(0, mid));
        await insertProductBatch(batch.slice(mid));
      }
    }

    let insertedProducts = 0;
    for (const batch of chunks(productRows, batchSize)) {
      await insertProductBatch(batch);
      insertedProducts += batch.length;
      console.log(`products ${insertedProducts} / ${productRows.length}`);
    }

    const reviewRows = drafts.flatMap((draft) => {
      const productId = productIds.get(draft.slug);
      if (!productId) throw new Error(`Missing product ${draft.slug}`);
      return draft.reviews.map((review) => ({
        id: randomUUID(),
        productId,
        userId: null,
        authorName: review.authorName,
        rating: review.rating,
        title: review.title,
        body: review.body,
        isVerified: review.verified,
        helpfulCount: review.helpfulCount,
        createdAt: review.createdAt,
      }));
    });

    async function insertReviewBatch(batch: typeof reviewRows): Promise<void> {
      try {
        await db.transaction(async (tx) => {
          await tx.insert(reviews).values(batch);
        });
      } catch (error) {
        if (batch.length <= 1) {
          throw new Error(`review ${batch[0]?.productId ?? "unknown"}: ${causeMessage(error)}`);
        }
        const mid = Math.ceil(batch.length / 2);
        await insertReviewBatch(batch.slice(0, mid));
        await insertReviewBatch(batch.slice(mid));
      }
    }

    let insertedReviews = 0;
    for (const batch of chunks(reviewRows, batchSize)) {
      await insertReviewBatch(batch);
      insertedReviews += batch.length;
      console.log(`reviews ${insertedReviews} / ${reviewRows.length}`);
    }

    await db.execute(sql`
      update products as product
      set
        rating_average = stats.average,
        review_count = stats.review_count
      from (
        select
          product_id,
          avg(rating)::real as average,
          count(*)::int as review_count
        from reviews
        group by product_id
      ) as stats
      where product.id = stats.product_id
    `);

    await db.execute(sql`
      update products
      set search_vector = to_tsvector(
        'english',
        title || ' ' || description || ' ' || brand || ' ' || coalesce(
          (
            select string_agg(value, ' ')
            from jsonb_array_elements_text(bullets) as value
          ),
          ''
        )
      )
    `);

    const mismatch = await db.execute<{ count: number }>(sql`
      select count(*)::int as count
      from products as product
      where product.review_count <> (
          select count(*)::int from reviews as review where review.product_id = product.id
        )
        or abs(
          product.rating_average - (
            select avg(rating)::real from reviews as review where review.product_id = product.id
          )
        ) > 0.001
    `);

    const counts = await db.execute<{ name: string; products: number; reviews: number }>(sql`
      select
        parent.name as name,
        count(distinct product.id)::int as products,
        count(review.id)::int as reviews
      from categories as parent
      join categories as child on child.parent_id = parent.id
      join products as product on product.category_id = child.id
      left join reviews as review on review.product_id = product.id
      group by parent.name, parent.sort_order
      order by parent.sort_order
    `);

    const mismatchRows = mismatch.rows ?? [];
    const countRows = counts.rows ?? [];
    return {
      categories: rows.length,
      products: drafts.length,
      reviews: reviewRows.length,
      ratingMismatches: Number(mismatchRows[0]?.count ?? 0),
      perCategory: countRows.map((row) => ({
        name: row.name,
        products: Number(row.products),
        reviews: Number(row.reviews),
      })),
    };
  } finally {
    await pool.end();
  }
}

export async function writeDataReadme(report: LoadReport, datasets: string[]): Promise<void> {
  const directory = path.join(process.cwd(), "data");
  await mkdir(directory, { recursive: true });
  const lines = [
    "# Catalogue data",
    "",
    "Barrow's products and reviews come from the Amazon Reviews 2023 dataset, published for research by the McAuley Lab at UC San Diego.",
    "",
    "Citation: Yupeng Hou, Jiacheng Li, Zhankui He, An Yan, Xiusi Chen, and Julian McAuley. Bridging Language and Items for Retrieval and Recommendation. arXiv:2403.03952, 2024.",
    "",
    "Source: https://amazon-reviews-2023.github.io/",
    "",
    "The lab makes the dataset available for research. Barrow is a portfolio project and claims no rights in the product text, images, or reviews. Images are hotlinked from the dataset URLs, not re-hosted.",
    "",
    "Reviewer identities were not imported. The dataset's reviewer id never leaves the raw file, and each review is shown under a generated display name.",
    "",
    "Prices in the dataset are US dollars. They are stored here as pounds, with no conversion: a dataset price of 12.99 becomes 1299 pence.",
    "",
    `Categories imported: ${datasets.join(", ")}.`,
    "",
    `Rows: ${report.categories} categories, ${report.products} products, ${report.reviews} reviews.`,
    "",
    ...report.perCategory.map(
      (category) => `- ${category.name}: ${category.products} products, ${category.reviews} reviews`,
    ),
    "",
    `Stored rating averages disagree with the inserted reviews on ${report.ratingMismatches} products.`,
    "",
  ];
  await writeFile(path.join(directory, "README.md"), lines.join("\n"), "utf8");
}
