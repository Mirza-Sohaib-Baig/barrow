import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

async function signIn(page: Page) {
  await page.goto("/signin");
  const demo = page.getByRole("button", { name: "Use the demo account" });
  await expect(async () => {
    await demo.click();
    await expect(page.getByLabel("Email")).toHaveValue("demo@barrow.shop", { timeout: 2_000 });
  }).toPass({ timeout: 20_000 });
  await page.waitForURL((url) => !url.pathname.startsWith("/signin"), { timeout: 30_000 });
}

async function emptyCart(page: Page) {
  await page.goto("/cart");
  const empty = page.getByRole("heading", { name: "Your cart is empty." });
  const list = page.getByRole("list", { name: "Cart items" });
  await expect(empty.or(list)).toBeVisible();
  if (await empty.isVisible()) return;

  for (;;) {
    const remove = list.getByRole("button", { name: /^Remove / });
    const before = await remove.count();
    if (before === 0) return;
    await remove.first().click();
    if (before === 1) {
      await expect(empty).toBeVisible();
      return;
    }
    await expect(remove).toHaveCount(before - 1);
  }
}

async function stripeInput(page: Page, name: string) {
  let found = page.locator("body");
  await expect
    .poll(async () => {
      for (const frame of page.frames()) {
        const input = frame.locator(`input[name="${name}"]`);
        if ((await input.count()) > 0) {
          found = input;
          return true;
        }
      }
      return false;
    }, { timeout: 20_000 })
    .toBe(true)
    .catch(async (error: unknown) => {
      const described: string[] = [];
      for (const frame of page.frames()) {
        if (!frame.url().includes("stripe.com")) continue;
        const text = await frame.locator("body").innerText({ timeout: 1_000 }).catch(() => "");
        const inputs = await frame
          .locator("input, button, [role='radio']")
          .evaluateAll((nodes) =>
            nodes
              .slice(0, 12)
              .map(
                (node) =>
                  node.getAttribute("name") ||
                  node.getAttribute("aria-label") ||
                  node.textContent?.trim().slice(0, 40) ||
                  node.tagName,
              ),
          )
          .catch(() => []);
        if (text.trim() || inputs.length > 0) described.push(`${text.trim().slice(0, 160)} [${inputs.join(", ")}]`);
      }
      throw new Error(`Stripe field ${name} was not found. ${described.join(" | ")}`, { cause: error });
    });
  return found;
}

async function pay(page: Page) {
  await expect
    .poll(async () => {
      for (const frame of page.frames()) {
        if ((await frame.locator('input[name="number"]').count()) > 0) return true;
        const cardChoice = frame.getByRole("button", { name: /^card$/i });
        if ((await cardChoice.count()) > 0) {
          await cardChoice.first().click();
          return true;
        }
      }
      return false;
    }, { timeout: 20_000 })
    .toBe(true);

  const number = await stripeInput(page, "number");
  await number.fill("4242424242424242");
  await (await stripeInput(page, "expiry")).fill("1234");
  await (await stripeInput(page, "cvc")).fill("123");

  const postcode = page.getByLabel("Postcode");
  if (await postcode.isVisible()) {
    await page.getByLabel("Full name").fill("Ada Lovelace");
    await page.getByLabel("Phone").fill("02079460958");
    await page.getByLabel("Address line 1").fill("1 Example Street");
    await page.getByLabel("Town or city").fill("London");
    await postcode.fill("SW1A 1AA");
  }

  await page.getByRole("button", { name: /^Pay/ }).click();
  const destination = page.waitForURL(/\/orders\/B-/, { timeout: 45_000 }).then(() => "ok" as const);
  const failure = page
    .getByTestId("checkout-error")
    .waitFor({ timeout: 45_000 })
    .then(async () => (await page.getByTestId("checkout-error").innerText()).trim());
  void destination.catch(() => undefined);
  void failure.catch(() => undefined);
  const result = await Promise.race([destination, failure]);
  if (result !== "ok") throw new Error(result);
  await expect(page.getByTestId("order-number")).toBeVisible();
}

test("product page to a paid order", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await emptyCart(page);
  await page.goto("/");
  await page.locator('a[href^="/p/"]').first().click();
  await page.getByRole("button", { name: "Add to cart" }).first().click();
  await expect(page.getByText("Added to cart")).toBeVisible({ timeout: 15_000 });
  await page.goto("/checkout");
  await expect(page.getByRole("heading", { name: "Payment" })).toBeVisible();
  await pay(page);
  await expect(page.getByRole("heading", { name: "Order placed" })).toBeVisible();
});

test("buy now leaves the cart unchanged", async ({ page }) => {
  test.setTimeout(120_000);
  await signIn(page);
  await emptyCart(page);
  await page.goto("/");
  const add = page.getByRole("button", { name: "Add to cart" });
  await add.nth(0).click();
  await expect(page.getByText("Added to cart").first()).toBeVisible({ timeout: 15_000 });
  await add.nth(1).click();
  await expect
    .poll(async () => {
      await page.goto("/cart");
      const list = page.getByRole("list", { name: "Cart items" });
      if ((await list.count()) === 0) return 0;
      return list.getByRole("link").count();
    }, { timeout: 20_000 })
    .toBe(2);

  const kept = await page.getByRole("list", { name: "Cart items" }).getByRole("link").allTextContents();
  expect(kept).toHaveLength(2);

  await page.goto("/");
  const links = page.locator('a[href^="/p/"]');
  const count = await links.count();
  let opened = false;
  for (let index = 0; index < count; index += 1) {
    const text = (await links.nth(index).innerText()).trim();
    if (!kept.some((title) => text.includes(title.trim()) || title.trim().includes(text))) {
      await links.nth(index).click();
      opened = true;
      break;
    }
  }
  expect(opened).toBe(true);

  const bought = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  await page.getByRole("button", { name: "Buy now" }).first().click();
  await page.waitForURL(/\/checkout\?buy=1/);
  await expect(page.getByText("Your cart is unchanged.")).toBeVisible();
  await pay(page);

  await page.goto("/cart");
  const list = page.getByRole("list", { name: "Cart items" });
  await expect(list.getByRole("link")).toHaveCount(2);
  for (const title of kept) {
    await expect(list.getByRole("link", { name: title.trim() })).toBeVisible();
  }
  await expect(list.getByRole("link", { name: bought })).toHaveCount(0);
});
