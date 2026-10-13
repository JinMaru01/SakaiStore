import { expect, expectNoHorizontalOverflow, ORDER_URL, placeMobileLegendsOrder, test } from "./helpers";

/**
 * The money path, as a customer arriving from a Facebook/TikTok post would
 * walk it: home → game → account + nickname → package → promo → KHQR → paid.
 * Runs on the "mobile" (Pixel 7) and "desktop" projects.
 */
test("buys Mobile Legends diamonds with a promo code and pays by KHQR", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Top up your games");

  // Home → game page.
  await page.getByRole("link", { name: /Mobile Legends/ }).first().click();
  await expect(page).toHaveURL(/\/games\/mobile-legends$/);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Mobile Legends");

  // Account: ID + zone, then the nickname check (PLAYER_LOOKUP_MODE=mock).
  await page.getByLabel("User ID").fill("123456789");
  await page.getByLabel("Zone ID").fill("1234");
  await page.getByRole("button", { name: "Check player name" }).click();
  const found = page.getByText(/^Player:/);
  await expect(found).toBeVisible();
  const nickname = (await found.locator("strong").textContent())?.trim() ?? "";
  expect(nickname).not.toBe("");

  // Package.
  await page.getByText("172 Diamonds", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /\b172 Diamonds\b/ })).toBeChecked();

  // Promo: 5% of $2.95 = $0.14 off → $2.81.
  await page.getByRole("textbox", { name: "Promo code" }).fill("WELCOME5");
  await page.getByRole("button", { name: "Apply" }).click();
  await expect(page.getByText("WELCOME5 applied: you save $0.14")).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Pay → order page with a KHQR.
  await page.getByRole("button", { name: "Pay with KHQR" }).click();
  await expect(page).toHaveURL(ORDER_URL);
  const code = ORDER_URL.exec(new URL(page.url()).pathname)![1]!;

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scan & pay to complete your order");
  await expect(page.getByRole("img", { name: "KHQR payment QR code" }).first()).toBeVisible();
  await expect(page.getByText("Pay $2.81 with KHQR")).toBeVisible();
  await expect(page.getByText(code).first()).toBeVisible();
  await expect(page.getByText(nickname).first()).toBeVisible();
  await expectNoHorizontalOverflow(page);

  // Mock mode: "Simulate payment" stands in for scanning with a bank app.
  await page.getByRole("button", { name: "Simulate payment (test mode)" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order in progress");
  await expect(page.getByText("Delivering your top-up")).toBeVisible();
  await expect(page.getByRole("img", { name: "KHQR payment QR code" })).toHaveCount(0);

  // A reload shows the same server state (and the order is in this device's recent orders).
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order in progress");
  await page.goto("/track");
  await expect(page.getByRole("link", { name: new RegExp(code) })).toBeVisible();
});

test("cancels an unpaid order after confirming", async ({ page }) => {
  await placeMobileLegendsOrder(page, { packageName: "22 Diamonds" });

  // Dismissing the "Don't cancel if you have already paid" confirm keeps the order.
  page.once("dialog", (d) => void d.dismiss());
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scan & pay to complete your order");

  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Cancel order" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Order cancelled");
  await expect(page.getByText("No payment was taken")).toBeVisible();
  await expect(page.getByRole("link", { name: "Order again" })).toBeVisible();
});

test("switches the storefront to Khmer and back", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Top up your games");

  await page.getByRole("button", { name: "ភាសាខ្មែរ" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "km");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("បញ្ចូលហ្គេមរបស់អ្នក");
  await expect(page.getByRole("button", { name: "ភាសាខ្មែរ" })).toHaveAttribute("aria-pressed", "true");

  // The choice sticks (cookie) across navigations, including the order form.
  await page.goto("/games/free-fire");
  await expect(page.getByRole("button", { name: "បង់ប្រាក់ដោយ KHQR" })).toBeVisible();

  await page.getByRole("button", { name: "English" }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("button", { name: "Pay with KHQR" })).toBeVisible();
});

test.describe("small phones (360px wide, common budget Android)", () => {
  test.use({ viewport: { width: 360, height: 740 } });
  test.skip(({ isMobile }) => !isMobile, "phone layout only");

  test("order form with an applied promo and the KHQR page fit without sideways scrolling", async ({ page }) => {
    // ?promo= from a TikTok caption link is applied as soon as a package is picked.
    await page.goto("/games/mobile-legends?promo=TIKTOK5");
    await page.getByLabel("User ID").fill("123456789");
    await page.getByLabel("Zone ID").fill("1234");
    await page.getByText("86 Diamonds", { exact: true }).click();
    await expect(page.getByText(/TIKTOK5 applied/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
    // Both buttons fully on screen horizontally (they were cut off when the promo row overflowed).
    for (const name of ["Remove", "Pay with KHQR"]) {
      const box = (await page.getByRole("button", { name }).boundingBox())!;
      expect(box.x + box.width, `${name} button right edge`).toBeLessThanOrEqual(360);
    }

    await page.getByRole("button", { name: "Pay with KHQR" }).click();
    await expect(page).toHaveURL(ORDER_URL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Scan & pay to complete your order");
    await expectNoHorizontalOverflow(page);
  });
});
