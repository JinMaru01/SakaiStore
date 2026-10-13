import { adminLogin, expect, placeMobileLegendsOrder, simulatePayment, test } from "./helpers";

/**
 * The owner's side of an order: a paid order waits in the admin panel, the
 * owner tops up in-game, marks it delivered, and the customer sees it.
 */
test("admin delivers a paid order and the customer sees it delivered", async ({ page }) => {
  const { code } = await placeMobileLegendsOrder(page, { packageName: "Weekly Diamond Pass" });
  await simulatePayment(page, code);

  // Deep link while signed out → login → back to the orders list.
  await adminLogin(page, "/admin/orders");
  await expect(page).toHaveURL(/\/admin\/orders$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Orders");

  // Open the order from the list (table on desktop, cards on phones).
  await page.getByRole("link", { name: new RegExp(code) }).first().click();
  await expect(page).toHaveURL(/\/admin\/orders\/[0-9a-f-]{36}$/);
  const heading = page.getByRole("heading", { level: 1 });
  await expect(heading).toContainText(code);
  await expect(heading).toContainText("Processing");
  await expect(page.getByText("123456789").first()).toBeVisible();

  // Two-tap confirm guards against accidental deliveries.
  await page.getByRole("button", { name: "Mark delivered" }).click();
  await page.getByRole("button", { name: "Tap again to confirm" }).click();
  await expect(heading).toContainText("Delivered");
  await expect(page.getByRole("button", { name: "Mark delivered" })).toHaveCount(0);

  // The customer's order page reflects it.
  await page.goto(`/orders/${code}`);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order complete");
  await expect(page.getByText("Top-up delivered!")).toBeVisible();
});

test("admin pages require sign-in", async ({ page }) => {
  const res = await page.request.get("/admin/orders/export");
  expect(res.status()).toBe(401);
  await page.goto("/admin/settings");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fsettings$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Admin");
});
