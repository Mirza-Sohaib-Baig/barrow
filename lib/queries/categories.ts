import { cacheLife, cacheTag } from "next/cache";
import { asc } from "drizzle-orm";
import { categories } from "@/drizzle/schema";
import { type CategoryRecord } from "@/lib/categories";
import { db } from "@/lib/db";

export async function getCategoryIndex(): Promise<CategoryRecord[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  return db
    .select({
      id: categories.id,
      name: categories.name,
      slug: categories.slug,
      parentId: categories.parentId,
      imageUrl: categories.imageUrl,
      sortOrder: categories.sortOrder,
    })
    .from(categories)
    .orderBy(asc(categories.sortOrder), asc(categories.name));
}
