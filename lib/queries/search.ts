import { cacheLife, cacheTag } from "next/cache";
import { sql } from "drizzle-orm";
import { products } from "@/drizzle/schema";
import { config } from "@/lib/config";
import { db } from "@/lib/db";
import { normalizeSearchQuery } from "@/lib/queries/catalogue-clauses";

function readText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function rowsOf(result: unknown): unknown[] {
  if (Array.isArray(result)) return result;
  if (typeof result === "object" && result !== null && "rows" in result && Array.isArray(result.rows)) {
    return result.rows;
  }
  return [];
}

export async function getAlternativeQueries(raw: string): Promise<string[]> {
  "use cache";
  cacheLife("hours");
  cacheTag("catalogue");

  const term = normalizeSearchQuery(raw);
  if (!term || term.length < config.suggestionMinLength) return [];

  const result = await db.execute(sql`
    select ${products.title} as title
    from ${products}
    where ${products.title} % ${term} or ${term} <% ${products.title}
    order by word_similarity(${term}, ${products.title}) desc, ${products.title} asc
    limit 24
  `);

  const seen = new Set<string>();
  const alternatives: string[] = [];
  const own = term.toLocaleLowerCase("en-GB");
  for (const value of rowsOf(result)) {
    if (typeof value !== "object" || value === null || !("title" in value)) continue;
    const title = readText(value.title);
    if (!title) continue;
    const key = title.toLocaleLowerCase("en-GB");
    if (key === own || seen.has(key)) continue;
    seen.add(key);
    alternatives.push(title);
    if (alternatives.length === 6) break;
  }
  return alternatives;
}
