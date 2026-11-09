import { getSuggestions } from "@/lib/queries/products";
import { normalizeSearchQuery } from "@/lib/queries/catalogue-clauses";

export async function GET(request: Request) {
  const term = normalizeSearchQuery(new URL(request.url).searchParams.get("q") ?? undefined);
  if (!term) return Response.json({ suggestions: [] });
  const suggestions = await getSuggestions(term);
  return Response.json({ suggestions });
}
