import { expect, test } from "@playwright/test";

test("search filters and sort survive a reload", async ({ page }) => {
  await page.goto("/");
  const search = page.getByTestId("search-input");
  await search.fill("wireless");
  await search.press("Enter");
  await expect(page).toHaveURL(/\/search\?/);
  await expect(page).toHaveURL(/q=wireless/);

  const titles = page.getByTestId("result-title");
  await expect(titles.first()).toBeVisible();

  await page.getByRole("link", { name: "In stock" }).first().click();
  await expect(page).toHaveURL(/stock=in/);

  const brand = page.locator("aside a, [data-slot='sheet-content'] a").filter({ hasText: /.+/ }).first();
  const brandName = (await brand.textContent())?.trim();
  if (brandName && brandName !== "In stock") {
    await brand.click();
  }

  await page.getByRole("link", { name: "Price: low to high" }).click();
  await expect(page).toHaveURL(/sort=price-asc/);
  await expect(page).toHaveURL(/q=wireless/);
  await expect(page).toHaveURL(/stock=in/);

  const before = await titles.allTextContents();
  await page.reload();
  await expect(page.getByTestId("result-title").first()).toBeVisible();
  await expect.poll(async () => page.getByTestId("result-title").allTextContents()).toEqual(before);
});
