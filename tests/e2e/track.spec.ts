import { expect, placeMobileLegendsOrder, test } from "./helpers";

/** Customers come back from Telegram/Facebook with just their order code. */
test("finds an order by its code on the track page", async ({ page }) => {
  const { code } = await placeMobileLegendsOrder(page, { packageName: "11 Diamonds" });

  // As if on another device: forget this browser's recent orders.
  await page.evaluate(() => localStorage.clear());
  await page.goto("/track");
  await expect(page.getByText("No recent orders on this device yet.")).toBeVisible();

  // Typed in lower case with stray spaces, as people do.
  await page.getByLabel("Order code").fill(`  ${code.toLowerCase()} `);
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page).toHaveURL(new RegExp(`/orders/${code}$`));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scan & pay to complete your order");
  await expect(page.getByText(code).first()).toBeVisible();
});

test("rejects a malformed order code without leaving the page", async ({ page }) => {
  await page.goto("/track");
  await page.getByLabel("Order code").fill("hello");
  await page.getByRole("button", { name: "Track order" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "valid order code" })).toBeVisible();
  await expect(page).toHaveURL(/\/track$/);
});
