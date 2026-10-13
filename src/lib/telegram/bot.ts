import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { orders } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { getOrderByCode, linkCustomerTelegram } from "@/lib/orders/service";
import { rateLimit } from "@/lib/rate-limit";
import { handleOrderCallback, handleOrderCommand, handleOrdersCommand, handleStatsCommand } from "./admin";
import { answerCallbackQuery, botUsername, isAdminChat, sendMessage } from "./api";
import { parseOrderCallback } from "./callbacks";
import { isForThisBot, parseCommand } from "./commands";
import {
  buildAdminHelp,
  buildChatIdText,
  buildCustomerHelp,
  buildCustomerLinked,
  buildCustomerStatus,
  buildRecentOrders,
  buildWelcome,
  localeFromTelegram,
  localeOf,
  type BotMessage,
} from "./format";
import { botStrings } from "./messages";
import { customerContext } from "./notifications";
import type { IncomingCallbackQuery, IncomingMessage, TelegramUpdate } from "./webhook";

/**
 * Webhook update dispatcher.
 *
 * Customers: /start (welcome), /start ord_<code> (link the chat for order
 * updates — the order page's "Get updates on Telegram" button), /status
 * [code], /help, or just paste an order code.
 * Admins (chats in TELEGRAM_ADMIN_CHAT_IDS): /orders, /order <code>, /stats,
 * /id, and the ✅/❌ buttons on order alerts.
 */

/** Messages per chat per minute before we stop answering (admins are exempt). */
const CUSTOMER_RATE_LIMIT = 20;
const RECENT_ORDERS = 5;
const START_ORDER_RE = /^ord_([A-Za-z0-9]{4,16})$/;
/** A bare order code pasted into the chat ("SK7F3K9Q2M", "#sk7f3k9q2m"). */
const BARE_CODE_RE = /^#?(SK[A-Za-z0-9]{8})$/i;

async function reply(chatId: number, msg: BotMessage | string): Promise<void> {
  const m = typeof msg === "string" ? { text: msg } : msg;
  await sendMessage(chatId, m.text, { replyMarkup: m.replyMarkup });
}

export async function handleUpdate(update: TelegramUpdate): Promise<void> {
  if (update.callback_query) return handleCallbackQuery(update.callback_query);
  if (update.message) return handleMessage(update.message);
}

async function handleCallbackQuery(cq: IncomingCallbackQuery): Promise<void> {
  // Either the tapping user or the chat holding the button must be an admin.
  if (!isAdminChat(cq.from.id, cq.message?.chat.id)) {
    console.warn(`[telegram] rejected callback from non-admin user ${cq.from.id}`);
    await answerCallbackQuery(cq.id, { text: "Not allowed", showAlert: true });
    return;
  }
  const cb = parseOrderCallback(cq.data);
  if (!cb) {
    await answerCallbackQuery(cq.id, { text: "Unknown action" });
    return;
  }
  await handleOrderCallback(cq, cb);
}

async function handleMessage(msg: IncomingMessage): Promise<void> {
  const text = msg.text?.trim();
  if (!text) return;
  const chatId = msg.chat.id;
  const isPrivate = msg.chat.type === "private";
  // Admin commands only in admin chats, so order details never land in another group.
  const admin = isAdminChat(chatId);
  const locale = localeFromTelegram(msg.from?.language_code);

  if (!admin && !rateLimit(`tg:${chatId}`, CUSTOMER_RATE_LIMIT, 60_000).ok) return;

  const cmd = parseCommand(text);
  if (!cmd) {
    if (!isPrivate) return; // never chat back in groups unless addressed with a command
    const bare = BARE_CODE_RE.exec(text);
    if (bare) return handleStatus(chatId, bare[1]!, locale);
    return reply(chatId, admin ? buildAdminHelp() : buildCustomerHelp(locale));
  }
  if (!isForThisBot(cmd, botUsername())) return;

  switch (cmd.name) {
    case "start":
      return handleStart(chatId, cmd.args, locale, admin);
    case "status":
      return handleStatus(chatId, cmd.args, locale);
    case "help":
      return reply(chatId, admin ? buildAdminHelp() : buildCustomerHelp(locale));
    case "id":
      return reply(chatId, buildChatIdText(chatId, admin));
  }
  if (admin) {
    switch (cmd.name) {
      case "orders":
        return handleOrdersCommand(chatId);
      case "order":
        return handleOrderCommand(chatId, cmd.args);
      case "stats":
        return handleStatsCommand(chatId);
    }
    return reply(chatId, buildAdminHelp());
  }
  if (isPrivate) return reply(chatId, buildCustomerHelp(locale));
}

/** /start, /start ord_<code> (deep link from the order page), /start <channel> (bio links). */
async function handleStart(chatId: number, payload: string, locale: Locale, admin: boolean): Promise<void> {
  const link = START_ORDER_RE.exec(payload);
  if (link) {
    const order = await linkCustomerTelegram(link[1]!, String(chatId));
    if (!order) return reply(chatId, botStrings(locale).status.notFound);
    return reply(chatId, buildCustomerLinked(order, await customerContext()));
  }
  if (admin && !payload) return reply(chatId, buildAdminHelp());
  return reply(chatId, buildWelcome(locale, await customerContext(), { payload }));
}

/** /status <code>, or /status alone for the orders linked to this chat. */
async function handleStatus(chatId: number, args: string, locale: Locale): Promise<void> {
  const s = botStrings(locale);
  const code = args.split(/\s+/)[0]?.replace(/^ord_/i, "");
  if (!code) {
    const recent = await db
      .select()
      .from(orders)
      .where(eq(orders.customerTelegramChatId, String(chatId)))
      .orderBy(desc(orders.createdAt))
      .limit(RECENT_ORDERS);
    if (recent.length === 0) return reply(chatId, s.status.usage);
    if (recent.length === 1) return reply(chatId, buildCustomerStatus(recent[0]!, await customerContext()));
    return reply(chatId, buildRecentOrders(recent, localeOf(recent[0]!)));
  }
  const order = await getOrderByCode(code);
  if (!order) return reply(chatId, s.status.notFound);
  return reply(chatId, buildCustomerStatus(order, await customerContext()));
}
