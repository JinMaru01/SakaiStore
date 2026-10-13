import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/telegram/webhook/route";
import type { Order } from "@/db/schema";
import { getGameBySlug } from "@/lib/catalog";
import { resetEnvCache } from "@/lib/env";
import {
  createOrder,
  getOrderByCode,
  linkCustomerTelegram,
  listOrderEvents,
  markOrderPaid,
} from "@/lib/orders/service";
import { resetRateLimits } from "@/lib/rate-limit";
import { updateSettings } from "@/lib/settings";
import { resetSeenUpdates } from "@/lib/telegram/webhook";
import { resetDb, seedCatalog } from "../helpers/db";
import {
  callbackDataOf,
  installFakeTelegram,
  keyboardOf,
  messageIdOf,
  setTelegramEnv,
  SITE,
  TEST_TOKEN,
  WEBHOOK_SECRET,
  type FakeTelegram,
  type TgCall,
} from "./fake-telegram";

let tg: FakeTelegram;
let updateId = 1000;

const ADMIN = 1001;
const OTHER_ADMIN = 1002;
const CUSTOMER = 555;
const STRANGER = 999;

function webhook(update: Record<string, unknown> | string, secret: string | null = WEBHOOK_SECRET) {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (secret !== null) headers["x-telegram-bot-api-secret-token"] = secret;
  const body = typeof update === "string" ? update : JSON.stringify({ update_id: updateId++, ...update });
  return POST(new Request("http://localhost:3000/api/telegram/webhook", { method: "POST", headers, body }));
}

const user = (id: number, first_name = "Sokha", extra: Record<string, unknown> = {}) => ({
  id,
  is_bot: false,
  first_name,
  ...extra,
});

function text(chatId: number, body: string, opts: { from?: object; chatType?: string } = {}) {
  return {
    message: {
      message_id: updateId,
      date: Math.floor(Date.now() / 1000),
      chat: { id: chatId, type: opts.chatType ?? "private" },
      from: opts.from ?? user(chatId, "Dara"),
      text: body,
    },
  };
}

function tap(fromId: number, data: string, msg?: { chatId: number; messageId: number }) {
  return {
    callback_query: {
      id: `cbq-${updateId}`,
      from: user(fromId),
      chat_instance: "abc",
      data,
      message: msg
        ? { message_id: msg.messageId, date: 1, chat: { id: msg.chatId, type: "private" }, text: "alert" }
        : undefined,
    },
  };
}

async function newOrder(locale: "en" | "km" = "en"): Promise<Order> {
  const game = (await getGameBySlug("mobile-legends"))!;
  const pkg = game.packages.find((p) => p.name === "Weekly Diamond Pass")!;
  return createOrder(
    { gameSlug: "mobile-legends", packageId: pkg.id, playerId: "123456789", zoneId: "1234" },
    { locale },
  );
}

/** A paid order (→ processing in manual fulfillment) whose alerts went to both admin chats. */
async function paidOrder(locale: "en" | "km" = "en"): Promise<Order> {
  const order = await newOrder(locale);
  return (await markOrderPaid(order.id, { actor: "system", ref: "BAKONGHASH" }))!;
}

function alertTo(chatId: number): TgCall {
  const call = tg.messagesTo(chatId).find((c) => String(c.params.text).includes("New paid order"));
  if (!call) throw new Error(`no alert sent to ${chatId}`);
  return call;
}

const lastTextTo = (chatId: number) => String(tg.messagesTo(chatId).at(-1)?.params.text ?? "");

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
  resetRateLimits();
  resetSeenUpdates();
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

describe("webhook authentication", () => {
  it("rejects a wrong or missing secret with 401 and does nothing", async () => {
    const order = await paidOrder();
    tg.reset();
    const update = tap(ADMIN, `ord:dlv:${order.code}`);

    expect((await webhook(update, "wrong-secret")).status).toBe(401);
    expect((await webhook(update, null)).status).toBe(401);
    expect(tg.calls).toHaveLength(0);
    expect((await getOrderByCode(order.code))!.status).toBe("processing");
  });

  it("refuses every update in production when no secret is configured", async () => {
    setTelegramEnv({ TELEGRAM_WEBHOOK_SECRET: "", NODE_ENV: "production" });
    expect((await webhook(text(CUSTOMER, "/help"), null)).status).toBe(401);
    expect(tg.calls).toHaveLength(0);
  });

  it("answers 200 to malformed bodies without calling Telegram", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    expect((await webhook("not json")).status).toBe(200);
    expect((await webhook({ message: "nope" } as Record<string, unknown>)).status).toBe(200);
    expect(tg.calls).toHaveLength(0);
  });

  it("answers 200 when Telegram is unreachable and keeps the token out of logs", async () => {
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    tg.fetchMock.mockRejectedValue(new Error(`connect ECONNREFUSED https://api.telegram.org/bot${TEST_TOKEN}/sendMessage`));
    expect((await webhook(text(CUSTOMER, "/help"))).status).toBe(200);
    // The token never reaches the logs.
    expect(JSON.stringify(err.mock.calls)).not.toContain(TEST_TOKEN);
  });
});

describe("admin order buttons", () => {
  it("✅ marks the order delivered, answers the tap and updates every admin's alert", async () => {
    const order = await paidOrder();
    const mine = alertTo(ADMIN);
    const theirs = alertTo(OTHER_ADMIN);
    expect(callbackDataOf(mine)).toEqual([`ord:dlv:${order.code}`, `ord:fail:${order.code}`]);

    const res = await webhook(tap(ADMIN, `ord:dlv:${order.code}`, { chatId: ADMIN, messageId: messageIdOf(mine) }));
    expect(res.status).toBe(200);

    const updated = (await getOrderByCode(order.code))!;
    expect(updated.status).toBe("delivered");
    expect(updated.deliveredAt).toBeInstanceOf(Date);
    const delivered = (await listOrderEvents(order.id)).filter((e) => e.type === "delivered");
    expect(delivered).toHaveLength(1);
    expect(delivered[0]).toMatchObject({ actor: "telegram" });
    expect(delivered[0]!.message).toContain("Sokha");

    const [answer] = tg.callsTo("answerCallbackQuery");
    expect(answer!.params).toMatchObject({ callback_query_id: expect.any(String) });
    expect(String(answer!.params.text)).toContain(`${order.code} marked delivered`);

    const edits = tg.callsTo("editMessageText");
    expect(edits.map((e) => [String(e.params.chat_id), e.params.message_id]).sort()).toEqual(
      [
        [String(ADMIN), messageIdOf(mine)],
        [String(OTHER_ADMIN), messageIdOf(theirs)],
      ].sort(),
    );
    for (const edit of edits) {
      expect(String(edit.params.text)).toContain("✅ <b>Delivered</b> by Sokha at");
      expect(String(edit.params.text)).toContain("New paid order");
      // Action buttons are gone; the admin link stays.
      expect(callbackDataOf(edit)).toEqual([]);
      expect(keyboardOf(edit).flat().map((b) => b.url)).toEqual([`${SITE}/admin/orders/${order.id}`]);
    }
  });

  it("rejects taps from non-admins and leaves the order unchanged", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const order = await paidOrder();
    tg.reset();

    await webhook(tap(STRANGER, `ord:dlv:${order.code}`, { chatId: STRANGER, messageId: 1 }));

    expect((await getOrderByCode(order.code))!.status).toBe("processing");
    const [answer] = tg.callsTo("answerCallbackQuery");
    expect(answer!.params).toMatchObject({ text: "Not allowed", show_alert: true });
    expect(tg.callsTo("editMessageText")).toHaveLength(0);
  });

  it("a second tap (double click or another admin) answers \"Already delivered\"", async () => {
    const order = await paidOrder();
    const mine = { chatId: ADMIN, messageId: messageIdOf(alertTo(ADMIN)) };

    await webhook(tap(ADMIN, `ord:dlv:${order.code}`, mine));
    tg.reset();
    await webhook(tap(ADMIN, `ord:dlv:${order.code}`, mine));

    expect(tg.callsTo("answerCallbackQuery")[0]!.params.text).toBe("Already delivered");
    // The stale card is refreshed (no buttons) instead of being left as is.
    const [edit] = tg.callsTo("editMessageText");
    expect(callbackDataOf(edit!)).toEqual([]);
    expect(String(edit!.params.text)).toContain("✅ <b>Delivered</b> via Telegram");
    expect((await listOrderEvents(order.id)).filter((e) => e.type === "delivered")).toHaveLength(1);
  });

  it("❌ marks the order failed and tells the linked customer", async () => {
    const order = await newOrder();
    await linkCustomerTelegram(order.code, String(CUSTOMER));
    await markOrderPaid(order.id, { actor: "system" });
    const mine = { chatId: ADMIN, messageId: messageIdOf(alertTo(ADMIN)) };
    tg.reset();

    await webhook(tap(ADMIN, `ord:fail:${order.code}`, mine));

    expect((await getOrderByCode(order.code))!.status).toBe("failed");
    expect(String(tg.callsTo("answerCallbackQuery")[0]!.params.text)).toContain("marked failed");
    expect(lastTextTo(CUSTOMER)).toContain("We couldn't complete your top-up");
    expect(tg.callsTo("editMessageText")).toHaveLength(2);
    for (const edit of tg.callsTo("editMessageText")) {
      expect(String(edit.params.text)).toContain("❌ <b>Failed</b> by Sokha at");
    }
    // A person failed it in Telegram: no extra "order failed" alert for the admins.
    expect(tg.messagesTo(ADMIN)).toHaveLength(0);
  });

  it("ord:view (from /orders) sends the order card with action buttons", async () => {
    const order = await paidOrder();
    tg.reset();
    await webhook(tap(ADMIN, `ord:view:${order.code}`, { chatId: ADMIN, messageId: 7 }));
    const [card] = tg.messagesTo(ADMIN);
    expect(String(card!.params.text)).toContain("Order details");
    expect(callbackDataOf(card!)).toEqual([`ord:dlv:${order.code}`, `ord:fail:${order.code}`]);
    expect(tg.callsTo("answerCallbackQuery")).toHaveLength(1);
  });

  it("accepts taps in a configured admin group from any member", async () => {
    setTelegramEnv({ TELEGRAM_ADMIN_CHAT_IDS: "-100200300" });
    const order = await paidOrder();
    const groupAlert = tg.messagesTo(-100200300)[0]!;
    await webhook(tap(STRANGER, `ord:dlv:${order.code}`, { chatId: -100200300, messageId: messageIdOf(groupAlert) }));
    expect((await getOrderByCode(order.code))!.status).toBe("delivered");
  });
});

describe("customer commands", () => {
  it("/start ord_<code> links the chat and replies with the order status", async () => {
    const order = await paidOrder();
    tg.reset();

    await webhook(text(CUSTOMER, `/start ord_${order.code}`));

    expect((await getOrderByCode(order.code))!.customerTelegramChatId).toBe(String(CUSTOMER));
    const [reply] = tg.messagesTo(CUSTOMER);
    expect(String(reply!.params.text)).toContain("You'll get updates here");
    expect(String(reply!.params.text)).toContain(`<code>${order.code}</code>`);
    expect(String(reply!.params.text)).toContain("Delivering");
    expect(reply!.params.parse_mode).toBe("HTML");
    expect(keyboardOf(reply!).flat()).toContainEqual({ text: "🧾 View order", url: `${SITE}/orders/${order.code}` });

    // Delivery is then pushed to the customer.
    await webhook(tap(ADMIN, `ord:dlv:${order.code}`, { chatId: ADMIN, messageId: 1 }));
    expect(lastTextTo(CUSTOMER)).toContain("Top-up delivered!");
  });

  it("/start with an unknown order code says it was not found", async () => {
    await webhook(text(CUSTOMER, "/start ord_SK22222222"));
    expect(lastTextTo(CUSTOMER)).toContain("couldn't find that order");
  });

  it("/start without an order sends the welcome with a tracked website link", async () => {
    await webhook(text(CUSTOMER, "/start tiktok"));
    const [reply] = tg.messagesTo(CUSTOMER);
    expect(String(reply!.params.text)).toContain("Welcome to Sakai Store");
    const site = keyboardOf(reply!).flat().find((b) => b.url?.startsWith(SITE));
    expect(site!.url).toContain("utm_source=tiktok");
  });

  it("/status <code> replies in the order's language (Khmer)", async () => {
    const order = await paidOrder("km");
    tg.reset();
    await webhook(text(CUSTOMER, `/status ${order.code.toLowerCase()}`));
    const reply = lastTextTo(CUSTOMER);
    expect(reply).toContain(order.code);
    expect(reply).toContain("កំពុងបញ្ចូល"); // "Delivering"
    expect(reply).toContain("<code>123456789</code>");
  });

  it("/status without a code lists the orders linked to this chat", async () => {
    const a = await paidOrder();
    const b = await newOrder();
    await linkCustomerTelegram(a.code, String(CUSTOMER));
    await linkCustomerTelegram(b.code, String(CUSTOMER));
    tg.reset();
    await webhook(text(CUSTOMER, "/status"));
    const reply = lastTextTo(CUSTOMER);
    expect(reply).toContain(a.code);
    expect(reply).toContain(b.code);
  });

  it("a pasted order code works like /status; unknown codes say not found", async () => {
    const order = await paidOrder();
    tg.reset();
    await webhook(text(CUSTOMER, `#${order.code}`));
    expect(lastTextTo(CUSTOMER)).toContain("Delivering");
    await webhook(text(CUSTOMER, "/status SK99999999"));
    expect(lastTextTo(CUSTOMER)).toContain("couldn't find that order");
  });

  it("unknown text gets short help; groups and other bots' commands are ignored", async () => {
    await webhook(text(CUSTOMER, "hello?"));
    expect(lastTextTo(CUSTOMER)).toContain("/status");

    tg.reset();
    await webhook(text(-500, "hello group", { chatType: "group" }));
    await webhook(text(-500, "/status@OtherBot SK22222222", { chatType: "group" }));
    expect(tg.calls).toHaveLength(0);
  });

  it("customers cannot use admin commands", async () => {
    const order = await paidOrder();
    tg.reset();
    await webhook(text(STRANGER, "/orders"));
    await webhook(text(STRANGER, `/order ${order.code}`));
    for (const call of tg.messagesTo(STRANGER)) {
      expect(String(call.params.text)).not.toContain(order.code);
      expect(String(call.params.text)).toContain("/status");
    }
  });

  it("Telegram re-deliveries of the same update are handled once", async () => {
    const body = JSON.stringify({ update_id: 77, ...text(CUSTOMER, "/help") });
    await webhook(body);
    await webhook(body);
    expect(tg.messagesTo(CUSTOMER)).toHaveLength(1);
  });
});

describe("admin commands", () => {
  it("/orders lists the delivery queue with tap-to-open buttons", async () => {
    const order = await paidOrder();
    tg.reset();
    await webhook(text(ADMIN, "/orders"));
    const [reply] = tg.messagesTo(ADMIN);
    expect(String(reply!.params.text)).toContain("Orders to handle");
    expect(String(reply!.params.text)).toContain(`<code>${order.code}</code>`);
    expect(callbackDataOf(reply!)).toEqual([`ord:view:${order.code}`]);
  });

  it("/order <code> shows details with ✅/❌ buttons", async () => {
    const order = await paidOrder();
    tg.reset();
    await webhook(text(ADMIN, `/order@SakaiTestBot ${order.code}`));
    const [reply] = tg.messagesTo(ADMIN);
    expect(String(reply!.params.text)).toContain("Order details");
    expect(String(reply!.params.text)).toContain("Processing");
    expect(callbackDataOf(reply!)).toEqual([`ord:dlv:${order.code}`, `ord:fail:${order.code}`]);
  });

  it("/stats shows today's paid orders and revenue", async () => {
    await paidOrder();
    await newOrder(); // unpaid: not counted
    tg.reset();
    await webhook(text(ADMIN, "/stats"));
    const reply = lastTextTo(ADMIN);
    expect(reply).toContain("Paid orders: <b>1</b>");
    expect(reply).toContain("Revenue: <b>$1.45</b>");
    expect(reply).toContain("🔗 Direct — 1 paid · $1.45");
  });

  it("/id shows the chat id", async () => {
    await webhook(text(STRANGER, "/id"));
    expect(lastTextTo(STRANGER)).toContain(`<code>${STRANGER}</code>`);
  });
});

describe("delivered message promotes the Facebook page and TikTok", () => {
  it("includes follow links, the follower promo code and a tracked top-up-again link", async () => {
    await updateSettings("social", {
      facebookUrl: "https://facebook.com/sakaistore",
      tiktokUrl: "https://www.tiktok.com/@sakaistore",
    });
    await updateSettings("marketing", { followPromoCode: "follow5" });
    const order = await newOrder();
    await linkCustomerTelegram(order.code, String(CUSTOMER));
    await markOrderPaid(order.id, { actor: "system" });
    tg.reset();

    await webhook(tap(ADMIN, `ord:dlv:${order.code}`, { chatId: ADMIN, messageId: 1 }));

    const [msg] = tg.messagesTo(CUSTOMER);
    const body = String(msg!.params.text);
    expect(body).toContain("Top-up delivered!");
    expect(body).toContain('<a href="https://facebook.com/sakaistore">Facebook</a>');
    expect(body).toContain("<code>FOLLOW5</code>");
    const urls = keyboardOf(msg!).flat().map((b) => b.url);
    expect(urls).toContain(`${SITE}/games/mobile-legends?utm_source=telegram&utm_medium=bot&utm_campaign=reorder`);
    expect(urls).toContain("https://www.tiktok.com/@sakaistore");
  });
});
