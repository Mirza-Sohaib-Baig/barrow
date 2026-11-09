import { config } from "@/lib/config";
import { importCategories, type ImportCategory } from "./categories";
import { contentLength, downloadFile, metaPath, metaUrl, reviewFileTooLarge, reviewPath, reviewUrl } from "./fetch";
import { loadCatalogue, writeDataReadme } from "./load";
import { readCategory } from "./transform";

function option(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value || value.startsWith("--")) {
    throw new Error(`${name} needs a value`);
  }
  return value;
}

function selectedCategories(): ImportCategory[] {
  const only = option("--only");
  if (!only) return [...importCategories];
  const match = importCategories.filter(
    (category) => category.dataset === only || category.slug === only || category.name === only,
  );
  if (match.length === 0) {
    throw new Error(`Unknown category "${only}". Choose one of ${importCategories.map((category) => category.dataset).join(", ")}.`);
  }
  return [...match];
}

function productCap(): number {
  const raw = option("--limit");
  if (!raw) return config.catalogueImport.productCap;
  const limit = Number(raw);
  if (!Number.isInteger(limit) || limit < 1) throw new Error("--limit must be a positive integer");
  return limit;
}

async function main(): Promise<void> {
  const categories = selectedCategories();
  const limit = productCap();
  const groups: { category: ImportCategory; products: Awaited<ReturnType<typeof readCategory>> }[] = [];

  for (const category of categories) {
    const reviews = reviewUrl(category.dataset);
    const meta = metaUrl(category.dataset);
    console.log(`fetch ${category.dataset}`);
    const reviewBytes = await contentLength(reviews);
    if (reviewFileTooLarge(reviewBytes)) {
      console.log(`Skipping ${category.dataset}: review file is ${reviewBytes} bytes (${reviews})`);
      continue;
    }
    const metaBytes = await contentLength(meta);
    await downloadFile(reviews, reviewPath(category.dataset), reviewBytes);
    await downloadFile(meta, metaPath(category.dataset), metaBytes);
    const products = await readCategory(reviewPath(category.dataset), metaPath(category.dataset), category, limit);
    console.log(`${category.dataset} kept ${products.length} products`);
    groups.push({ category, products });
  }

  const loaded = groups.filter((group) => group.products.length > 0);
  if (loaded.length === 0) throw new Error("No products to load");

  const report = await loadCatalogue(loaded, config.catalogueImport.batchSize);
  await writeDataReadme(
    report,
    loaded.map((group) => group.category.dataset),
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.ratingMismatches !== 0) {
    throw new Error(`${report.ratingMismatches} products disagree with their inserted reviews`);
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error && error.cause instanceof Error
      ? error.cause.message
      : error instanceof Error
        ? error.message.slice(0, 400)
        : "Import failed";
  console.error(message);
  process.exitCode = 1;
});
