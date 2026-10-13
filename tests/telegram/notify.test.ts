import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Order } from "@/db/schema";
import { getGameBySlug } from "@/lib/catalog";
import { resetEnvCache } from "@/lib/env";
import { notifyOrderPaid, notifyOrderStatusChanged } from "@/lib/notify";
import {
  createOrder,
  expireStaleOrders,
  getOrderByCode,
  linkCustomerTelegram,
  listOrderEvents,
  markOrderDelivered,
  markOrderFailed,
  markOrderPaid,
  markOrderProcessing,
} from "@/lib/orders/service";
import { resetDb, seedCatalog } from "../helpers/db";
import {
  callbackDataOf,
  installFakeTelegram,
  keyboardOf,
  setTelegramEnv,
  SITE,
  TEST_TOKEN,
  type FakeTelegram,
} from "./fake-telegram";

let tg: FakeTelegram;
const CUSTOMER = "555";

async function newOrder(): Promise<Order> {
  const game = (await getGameBySlug("mobile-legends"))!;
  const pkg = game.packages.find((p) => p.name === "Weekly Diamond Pass")!;
  return createOrder(
    {
      gameSlug: "mobile-legends",
      packageId: pkg.id,
      playerId: "123456789",
      zoneId: "1234",
      contactPhone: "012 345 678",
    },
    { attribution: { utmSource: "tiktok", utmCampaign: "oct_ml" } },
  );
}

const notifyEvents = async (orderId: string) =>
  (await listOrderEvents(orderId)).filter((e) => e.type === "notify" && e.actor === "system");

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
  setTelegramEnv();
  tg = installFakeTelegram();
});

afterEach(() => {
  // Nothing we sent would have been refused by the real Bot API.
  expect(tg.rejected).toEqual([]);
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  resetEnvCache();
  vi.restoreAllMocks();
});

describe("without a bot token", () => {
  it("does nothing and never calls Telegram", async () => {
    setTelegramEnv({ TELEGRAM_BOT_TOKEN: "" });
    const order = await newOrder();
    await linkCustomerTelegram(order.code, CUSTOMER);
    const paid = await markOrderPaid(order.id, { actor: "system" });
    await markOrderDelivered(order.id, { actor: "admin" });
    await notifyOrderPaid(paid!);

    expect(tg.fetchMock).not.toHaveBeenCalled();
    expect(await notifyEvents(order.id)).toHaveLength(0);
    expect((await getOrderByCode(order.code))!.status).toBe("delivered");
  });
});

describe("notifyOrderPaid", () => {
  it("alerts every admin chat with the order details and ✅/❌ buttons", async () => {
    setTelegramEnv({ TELEGRAM_ADMIN_CHAT_IDS: "1001, 1002,-100200300" });
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system" });

    const alerts = tg.callsTo("sendMessage");
    expect(alerts).toHaveLength(3);
    expect(alerts.map((c) => String(c.params.chat_id)).sort()).toEqual(["-100200300", "1001", "1002"]);
    for (const alert of alerts) {
      const text = String(alert.params.text);
      expect(text).toContain("💰 <b>New paid order</b>");
      expect(text).toContain(`<code>${order.code}</code>`);
      expect(text).toContain("Player ID: <code>123456789</code>");
      expect(text).toContain("Zone: <code>1234</code>");
      expect(text).toContain("<b>Weekly Diamond Pass</b>");
      expect(text).toContain("<b>$1.45</b>");
      expect(text).toContain("🎵 TikTok · oct_ml");
      expect(text).toContain("012 345 678");
      expect(alert.params.parse_mode).toBe("HTML");
      expect(callbackDataOf(alert)).toEqual([`ord:dlv:${order.code}`, `ord:fail:${order.code}`]);
      expect(keyboardOf(alert)[1]).toEqual([{ text: "Open in admin ↗", url: `${SITE}/admin/orders/${order.id}` }]);
    }
    const [event] = await notifyEvents(order.id);
    expect(event!.message).toContain("sent to 3 of 3");
  });

  it("still alerts the other admins when one chat fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    tg.failChat("1002");
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system" });

    expect(tg.messagesTo("1001")).toHaveLength(1);
    const [event] = await notifyEvents(order.id);
    expect(event!.message).toContain("sent to 1 of 2");
  });

  it("messages a linked customer once (no extra message for paid → processing)", async () => {
    const order = await newOrder();
    await linkCustomerTelegram(order.code, CUSTOMER);
    const after = await markOrderPaid(order.id, { actor: "system" });
    expect(after!.status).toBe("processing");

    const toCustomer = tg.messagesTo(CUSTOMER);
    expect(toCustomer).toHaveLength(1);
    expect(String(toCustomer[0]!.params.text)).toContain("Payment received");
    expect(keyboardOf(toCustomer[0]!).flat()).toContainEqual({ text: "🧾 View order", url: `${SITE}/orders/${order.code}` });
  });

  it("never throws when Telegram is unreachable, and keeps the token out of logs", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    tg.fetchMock.mockRejectedValue(new TypeError(`fetch failed for https://api.telegram.org/bot${TEST_TOKEN}/sendMessage`));
    const order = await newOrder();
    const paid = await markOrderPaid(order.id, { actor: "system" });

    expect(paid!.status).toBe("processing");
    await expect(notifyOrderPaid(paid!)).resolves.toBeUndefined();
    expect(err).toHaveBeenCalled();
    expect(JSON.stringify(err.mock.calls)).not.toContain(TEST_TOKEN);
  });

  it("omits buttons Telegram would reject when the site runs on localhost", async () => {
    setTelegramEnv({ NEXT_PUBLIC_SITE_URL: "http://localhost:3000" });
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system" });
    const [alert] = tg.messagesTo("1001");
    expect(keyboardOf(alert!).flat().some((b) => b.url)).toBe(false);
    expect(callbackDataOf(alert!)).toHaveLength(2);
  });
});

describe("notifyOrderStatusChanged", () => {
  it("syncs Telegram alerts when an order is delivered from the admin panel", async () => {
    const order = await newOrder();
    await linkCustomerTelegram(order.code, CUSTOMER);
    await markOrderPaid(order.id, { actor: "system" });
    tg.reset();

    await markOrderDelivered(order.id, { actor: "admin" });

    const edits = tg.callsTo("editMessageText");
    expect(edits.map((e) => String(e.params.chat_id)).sort()).toEqual(["1001", "1002"]);
    for (const edit of edits) {
      expect(String(edit.params.text)).toContain("✅ <b>Delivered</b> via admin panel at");
      expect(callbackDataOf(edit)).toEqual([]);
    }
    expect(String(tg.messagesTo(CUSTOMER)[0]!.params.text)).toContain("Top-up delivered!");
  });

  it("alerts admins when the system fails an order, and tells the customer", async () => {
    const order = await newOrder();
    await linkCustomerTelegram(order.code, CUSTOMER);
    await markOrderPaid(order.id, { actor: "system" });
    tg.reset();

    await markOrderFailed(order.id, { actor: "system", reason: "Supplier API error <timeout>" });

    for (const chat of ["1001", "1002"]) {
      expect(tg.messagesTo(chat)).toHaveLength(1);
      const [alert] = tg.messagesTo(chat);
      expect(String(alert!.params.text)).toContain("Order failed — needs attention");
      expect(String(alert!.params.text)).toContain("Supplier API error &lt;timeout&gt;");
      // failed → delivered is still possible; failing again is not.
      expect(callbackDataOf(alert!)).toEqual([`ord:dlv:${order.code}`]);
    }
    // The original paid alerts lose their buttons.
    expect(tg.callsTo("editMessageText")).toHaveLength(2);
    for (const edit of tg.callsTo("editMessageText")) {
      expect(String(edit.params.text)).toContain("❌ <b>Failed</b> automatically at");
      expect(callbackDataOf(edit)).toEqual([]);
    }
    expect(String(tg.messagesTo(CUSTOMER)[0]!.params.text)).toContain("We couldn't complete your top-up");
  });

  it("does not alert admins when a person failed the order", async () => {
    const order = await newOrder();
    await markOrderPaid(order.id, { actor: "system" });
    tg.reset();
    await markOrderFailed(order.id, { actor: "admin", reason: "Wrong player id" });
    expect(tg.callsTo("sendMessage")).toHaveLength(0);
    expect(tg.callsTo("editMessageText")).toHaveLength(2);
  });

  it("a retry brings the ✅/❌ buttons back and tells the customer", async () => {
    const order = await newOrder();
    await linkCustomerTelegram(order.code, CUSTOMER);
    await markOrderPaid(order.id, { actor: "system" });
    await markOrderFailed(order.id, { actor: "admin", reason: "Wrong id" });
    tg.reset();

    await markOrderProcessing(order.id, { actor: "admin", message: "Retry" });

    expect(tg.callsTo("editMessageText")).toHaveLength(2);
    for (const edit of tg.callsTo("editMessageText")) {
      expect(String(edit.params.text)).toContain("Retry started");
      expect(callbackDataOf(edit)).toEqual([`ord:dlv:${order.code}`, `ord:fail:${order.code}`]);
    }
    expect(String(tg.messagesTo(CUSTOMER)[0]!.params.text)).toContain("retrying your top-up");
  });

  it("tells a linked customer (in Khmer) when an unpaid order expires; admins hear nothing", async () => {
    const game = (await getGameBySlug("free-fire"))!;
    const order = await createOrder(
      { gameSlug: "free-fire", packageId: game.packages[0]!.id, playerId: "12345678" },
      { locale: "km" },
    );
    await linkCustomerTelegram(order.code, CUSTOMER);
    tg.reset();

    expect(await expireStaleOrders(new Date(Date.now() + 24 * 60 * 60_000))).toBe(1);

    expect(tg.calls.map((c) => c.method)).toEqual(["sendMessage"]);
    expect(String(tg.messagesTo(CUSTOMER)[0]!.params.text)).toContain("ផុតពេលបង់ប្រាក់");
  });

  it("never throws, even for a broken order object", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const order = await newOrder();
    await expect(
      notifyOrderStatusChanged({ ...order, id: "not-a-uuid", status: "failed" }, "processing"),
    ).resolves.toBeUndefined();
  });
});
