import { expect, test as base, type Page } from "@playwright/test";

/**
 * Shared e2e helpers. The app must run with PAYMENT_MODE=mock and
 * PLAYER_LOOKUP_MODE=mock against a migrated + seeded DB (see playwright.config.ts).
 */

export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "admin123";

/** Order codes look like SK + 8 characters (src/lib/orders/code.ts). */
export const ORDER_URL = /\/orders\/(SK[2-9A-HJ-NP-Z]{8})$/;

/**
 * `test` that fails on uncaught page errors (hydration crashes, client
 * exceptions) — the in-app browsers our customers use show a blank page then.
 */
export const test = base.extend<{ pageErrors: string[] }>({
  pageErrors: [
    async ({ page }, use) => {
      const errors: string[] = [];
      page.on("pageerror", (err) => errors.push(err.message));
      await use(errors);
      expect(errors, "uncaught errors in the page").toEqual([]);
    },
    { auto: true },
  ],
});

export { expect };

export type PlacedOrder = { code: string };

/**
 * Fill the Mobile Legends order form and pay. Returns the order code from the
 * /orders/<code> URL the form navigates to.
 */
export async function placeMobileLegendsOrder(
  page: Page,
  opts: { packageName?: string; promoCode?: string; checkName?: boolean } = {},
): Promise<PlacedOrder> {
  const packageName = opts.packageName ?? "172 Diamonds";
  await page.goto("/games/mobile-legends");
  await page.getByLabel("User ID").fill("123456789");
  await page.getByLabel("Zone ID").fill("1234");
  if (opts.checkName) {
    await page.getByRole("button", { name: "Check player name" }).click();
    await expect(page.getByText(/^Player:/)).toBeVisible();
  }
  await page.getByText(packageName, { exact: true }).click();
  await expect(page.getByRole("radio", { name: new RegExp(`\\b${packageName}\\b`) })).toBeChecked();
  if (opts.promoCode) {
    await page.getByRole("textbox", { name: "Promo code" }).fill(opts.promoCode);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByText(new RegExp(`${opts.promoCode} applied`))).toBeVisible();
  }
  await page.getByRole("button", { name: "Pay with KHQR" }).click();
  await expect(page).toHaveURL(ORDER_URL);
  const code = ORDER_URL.exec(new URL(page.url()).pathname)![1]!;
  return { code };
}

/** Mark an order paid through the mock-mode endpoint (what the "Simulate payment" button calls). */
export async function simulatePayment(page: Page, code: string) {
  const res = await page.request.post(`/api/orders/${code}/simulate-payment`);
  expect(res.status(), await res.text()).toBe(200);
}

/** Sign in to /admin (the login page redirects back to `next`). */
export async function adminLogin(page: Page, next = "/admin") {
  await page.goto(next);
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Password", { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/admin\/login/);
}

/**
 * No sideways scrolling. On phones an overflowing element makes the browser
 * zoom the layout out (innerWidth grows past the screen), pushing the fixed
 * Pay bar partly off-screen — so check both.
 */
export async function expectNoHorizontalOverflow(page: Page) {
  const screen = page.viewportSize()!.width;
  const { innerWidth, scrollWidth } = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(innerWidth, "layout viewport is wider than the screen").toBe(screen);
  expect(scrollWidth, "page scrolls sideways").toBeLessThanOrEqual(screen);
}
