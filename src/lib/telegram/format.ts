import { socialLinks, supportChatLinks, telegramHandle, telegramUserUrl } from "@/components/social/social-config";
import type { Order, OrderStatus } from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { formatAge, formatDateTime, formatDayKey, formatShortDateTime } from "@/lib/admin/format";
import { storeDateKey } from "@/lib/admin/time";
import type { Actor } from "@/lib/orders/service";
import { canTransition, STATUS_LABELS } from "@/lib/orders/status";
import type { Settings } from "@/lib/settings";
import { formatUsd } from "@/lib/utils";
import { orderCallbackData } from "./callbacks";
import type { InlineKeyboardButton, InlineKeyboardMarkup } from "./client";
import { botStrings, fill } from "./messages";

/**
 * Telegram message builders (parse_mode HTML). Pure: everything they need
 * (site URL, settings, "now") is passed in, so they are unit-tested without
 * a bot. Admin texts are English (like the admin panel); customer texts use
 * the order's locale (en/km, ./messages.ts).
 *
 * Every user- or DB-provided value goes through escapeHtml().
 */

export type BotMessage = { text: string; replyMarkup?: InlineKeyboardMarkup };

// ───────────────────────────── HTML & URL helpers ─────────────────────────────

/** Escape text for Telegram HTML (also safe inside attribute values). */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const esc = escapeHtml;
const code = (v: unknown) => `<code>${esc(v)}</code>`;

function clip(value: string | null | undefined, max: number): string {
  const v = (value ?? "").trim();
  return v.length > max ? `${v.slice(0, max - 1)}…` : v;
}

const PRIVATE_IPV4 = /^(?:0|10|127)\.|^169\.254\.|^192\.168\.|^172\.(?:1[6-9]|2\d|3[01])\./;

/**
 * True for http(s) URLs Telegram accepts in buttons. Telegram rejects the
 * whole message when a button points at localhost or a private address, so
 * in local development we simply leave such buttons out.
 */
export function isPublicHttpUrl(value: string | null | undefined): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.toLowerCase();
  if (!host.includes(".") || host.startsWith("[")) return false;
  if (host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) return false;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host) && PRIVATE_IPV4.test(host)) return false;
  return true;
}

/** <a> for public URLs; plain (escaped) label otherwise. */
function link(url: string | null | undefined, label: string): string {
  return url && isPublicHttpUrl(url) ? `<a href="${esc(url)}">${esc(label)}</a>` : esc(label);
}

function urlButton(text: string, url: string | null | undefined): InlineKeyboardButton | null {
  return url && isPublicHttpUrl(url) ? { text, url } : null;
}

function keyboard(rows: (InlineKeyboardButton | null)[][]): InlineKeyboardMarkup | undefined {
  const cleaned = rows.map((row) => row.filter((b): b is InlineKeyboardButton => b !== null)).filter((r) => r.length);
  return cleaned.length ? { inline_keyboard: cleaned } : undefined;
}

export const orderPageUrl = (siteUrl: string, orderCode: string) => `${siteUrl}/orders/${orderCode}`;
export const adminOrderUrl = (siteUrl: string, orderId: string) => `${siteUrl}/admin/orders/${orderId}`;

/** Site URL with UTM tags so sales from the bot show up as their own channel. */
export function withUtm(url: string, utm: { source: string; medium: string; campaign?: string }): string {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", utm.source);
    u.searchParams.set("utm_medium", utm.medium);
    if (utm.campaign) u.searchParams.set("utm_campaign", utm.campaign);
    return u.toString();
  } catch {
    return url;
  }
}

export function localeOf(order: Pick<Order, "locale">): Locale {
  return order.locale === "km" ? "km" : "en";
}

// ───────────────────────────── shared labels ─────────────────────────────

const CHANNEL_LABELS: Record<string, string> = {
  facebook: "📘 Facebook",
  tiktok: "🎵 TikTok",
  telegram: "✈️ Telegram",
  google: "🔎 Google",
  direct: "🔗 Direct",
  other: "🌐 Other",
};

/** "🎵 TikTok" etc. Unknown values render as "🌐 <value>". */
export function channelLabel(channel: string | null | undefined): string {
  const key = (channel ?? "").toLowerCase();
  return CHANNEL_LABELS[key] ?? `🌐 ${esc(clip(channel, 24) || "Other")}`;
}

export const STATUS_EMOJI: Record<OrderStatus, string> = {
  pending_payment: "🕓",
  paid: "💳",
  processing: "⏳",
  delivered: "✅",
  failed: "❌",
  refunded: "↩️",
  expired: "⌛",
  cancelled: "🚫",
};

// ───────────────────────────── admin: order card ─────────────────────────────

/** paid = new paid-order alert, failed = automatic failure alert, details = /order card. */
export type AdminCardKind = "paid" | "failed" | "details";

type AdminCardOrder = Pick<
  Order,
  | "id"
  | "code"
  | "status"
  | "gameName"
  | "packageName"
  | "playerId"
  | "zoneId"
  | "playerName"
  | "unitPriceCents"
  | "discountCents"
  | "totalCents"
  | "promoCode"
  | "channel"
  | "utmCampaign"
  | "createdAt"
  | "paidAt"
  | "deliveredAt"
  | "paymentExpiresAt"
  | "contactPhone"
  | "contactTelegram"
  | "customerTelegramChatId"
> &
  Partial<Pick<Order, "paymentRef">>;

function adminContactLine(order: AdminCardOrder): string {
  const parts: string[] = [];
  if (order.contactPhone) parts.push(esc(order.contactPhone));
  if (order.contactTelegram) {
    const url = telegramUserUrl(order.contactTelegram);
    const handle = telegramHandle(order.contactTelegram);
    parts.push(url && handle ? `Telegram ${link(url, handle)}` : `Telegram ${esc(order.contactTelegram)}`);
  }
  return `📞 Contact: ${parts.length ? parts.join(" · ") : "—"}`;
}

/**
 * Warning for a payment confirmed after the order had left pending_payment.
 * `paidFrom` is the status the order was paid from (recorded on the "paid"
 * event); when it is unknown (older orders) we fall back to comparing paidAt
 * with the QR expiry.
 */
export function latePaymentWarning(
  order: Pick<Order, "paidAt" | "paymentExpiresAt">,
  paidFrom: OrderStatus | null | undefined,
): string | null {
  if (paidFrom === "cancelled") {
    return "⚠️ <b>Paid after the order was cancelled.</b> The customer may have placed another order for the same top-up — check for a duplicate before delivering, and refund one of them.";
  }
  if (paidFrom === "expired") {
    return "⚠️ <b>Paid after the order had expired.</b> The customer may have been told the order expired — check the amount in your bank app, then let them know it's being delivered.";
  }
  if (paidFrom === undefined && order.paidAt && order.paymentExpiresAt && order.paidAt.getTime() > order.paymentExpiresAt.getTime()) {
    return "⚠️ Paid after the QR expired — double-check the amount in your bank app.";
  }
  return null;
}

/**
 * The admin view of an order: what to top up (Player ID / Zone in <code> so
 * a tap copies them), what was paid, where the customer came from.
 */
export function buildAdminOrderText(
  order: AdminCardOrder,
  opts: { kind: AdminCardKind; reason?: string | null; footer?: string | null; paidFrom?: OrderStatus | null },
): string {
  const lines: string[] = [];
  if (opts.kind === "paid") lines.push("💰 <b>New paid order</b>");
  else if (opts.kind === "failed") {
    lines.push("❗ <b>Order failed — needs attention</b>");
    if (opts.reason) lines.push(`<i>${esc(clip(opts.reason, 300))}</i>`);
  } else {
    lines.push(`🧾 <b>Order details</b> · ${STATUS_EMOJI[order.status]} ${STATUS_LABELS[order.status]}`);
  }
  lines.push("");
  lines.push(`🧾 Order ${code(order.code)}`);
  lines.push(`🎮 ${esc(order.gameName)}`);
  lines.push(`📦 <b>${esc(order.packageName)}</b>`);
  lines.push(`🆔 Player ID: ${code(order.playerId)}`);
  if (order.zoneId) lines.push(`🌐 Zone: ${code(order.zoneId)}`);
  if (order.playerName) lines.push(`👤 Nickname: ${esc(order.playerName)}`);

  let total = `💵 Total: <b>${formatUsd(order.totalCents)}</b>`;
  if (order.discountCents > 0) {
    const promo = order.promoCode ? ` promo ${code(order.promoCode)}` : "";
    total += ` (${formatUsd(order.unitPriceCents)} − ${formatUsd(order.discountCents)}${promo})`;
  }
  lines.push(total);
  lines.push(
    `📣 Channel: ${channelLabel(order.channel)}${order.utmCampaign ? ` · ${esc(clip(order.utmCampaign, 60))}` : ""}`,
  );
  lines.push(order.paidAt ? `🕒 Paid ${formatDateTime(order.paidAt)}` : `🕒 Ordered ${formatDateTime(order.createdAt)}`);
  if (opts.kind === "details" && order.deliveredAt) lines.push(`✅ Delivered ${formatDateTime(order.deliveredAt)}`);
  // simulate-payment marks orders paid with ref MOCK-<code>: make sure nobody tops up for free.
  if (order.paymentRef?.startsWith("MOCK-")) {
    lines.push("🧪 <b>TEST payment</b> (PAYMENT_MODE=mock) — no money was received.");
  }
  const late = latePaymentWarning(order, opts.paidFrom);
  if (late) lines.push(late);
  lines.push(adminContactLine(order));
  if (order.customerTelegramChatId) lines.push("🔔 Customer gets Telegram updates");
  if (opts.footer) lines.push("", opts.footer);
  return lines.join("\n");
}

/**
 * [✅ Delivered] [❌ Failed] (only the transitions the order allows) and an
 * "Open in admin" link. `actions: false` leaves just the link — used once an
 * action has been taken so nobody double-delivers from a stale message.
 */
export function adminOrderKeyboard(
  order: Pick<Order, "id" | "code" | "status">,
  opts: { siteUrl: string; actions: boolean },
): InlineKeyboardMarkup | undefined {
  const actions: InlineKeyboardButton[] = [];
  if (opts.actions && canTransition(order.status, "delivered")) {
    actions.push({ text: "✅ Delivered", callback_data: orderCallbackData("dlv", order.code) });
  }
  if (opts.actions && canTransition(order.status, "failed")) {
    actions.push({ text: "❌ Failed", callback_data: orderCallbackData("fail", order.code) });
  }
  return keyboard([actions, [urlButton("Open in admin ↗", adminOrderUrl(opts.siteUrl, order.id))]]);
}

export function buildAdminOrderCard(
  order: AdminCardOrder,
  opts: {
    kind: AdminCardKind;
    siteUrl: string;
    actions: boolean;
    reason?: string | null;
    footer?: string | null;
    /** Status the order was paid from (see latePaymentWarning). */
    paidFrom?: OrderStatus | null;
  },
): BotMessage {
  return {
    text: buildAdminOrderText(order, opts),
    replyMarkup: adminOrderKeyboard(order, opts),
  };
}

/** Statuses an admin "action footer" can describe. */
const FOOTER_VERBS: Partial<Record<OrderStatus, string>> = {
  delivered: "Delivered",
  failed: "Failed",
  refunded: "Refunded",
  processing: "Retry started",
  cancelled: "Cancelled",
  expired: "Expired",
};

/**
 * "✅ Delivered by Sokha at 13 Oct, 14:05" — appended to an alert after an
 * action. `by` (a Telegram first name) wins; otherwise the actor says how.
 */
export function adminActionFooter(p: {
  status: OrderStatus;
  at: Date;
  by?: string | null;
  actor?: Actor | string | null;
  reason?: string | null;
}): string {
  const verb = FOOTER_VERBS[p.status] ?? STATUS_LABELS[p.status];
  const by = clip(p.by, 64);
  const who = by
    ? ` by ${esc(by)}`
    : p.actor === "admin"
      ? " via admin panel"
      : p.actor === "system"
        ? " automatically"
        : p.actor === "telegram"
          ? " via Telegram"
          : p.actor === "customer"
            ? " by the customer"
            : "";
  const line = `${STATUS_EMOJI[p.status]} <b>${verb}</b>${who} at ${formatShortDateTime(p.at)}`;
  return p.reason ? `${line}\n<i>${esc(clip(p.reason, 300))}</i>` : line;
}

/** Callback answer when a button's action no longer applies (double click, other admin, admin panel). */
export function alreadyText(status: OrderStatus): string {
  const label = STATUS_LABELS[status].toLowerCase();
  return ["delivered", "failed", "refunded", "cancelled", "expired"].includes(status)
    ? `Already ${label}`
    : `Not possible — order is ${label}`;
}

// ───────────────────────────── admin: payment provider health ─────────────────────────────

/** Bakong payment checks started failing, or work again (src/lib/payments/health.ts). */
export type BakongHealthAlert =
  | {
      kind: "failing";
      /** The provider error, e.g. "Bakong API token rejected (HTTP 401) …". */
      message: string;
      /** PaymentErrorCode: auth | not_configured | timeout | network | http | bad_response | api_error. */
      code: string;
      /** First failed check of this outage. */
      since: Date;
    }
  | { kind: "recovered"; since: Date | null; at: Date };

function bakongFixHint(code: string): string {
  if (code === "auth") {
    return "Renew the token at api-bakong.nbc.gov.kh, update <code>BAKONG_API_TOKEN</code> and redeploy/restart.";
  }
  if (code === "not_configured") return "Set <code>BAKONG_API_TOKEN</code> and redeploy/restart.";
  return "Usually a Bakong outage or a network problem between the server and api-bakong.nbc.gov.kh. If it lasts, check the server can reach Bakong and that the token is still valid.";
}

/** Admin alert: payments can't be confirmed automatically / they can again. */
export function buildBakongHealthAlert(alert: BakongHealthAlert, opts: { siteUrl: string }): BotMessage {
  const settings = urlButton("Open settings in admin ↗", `${opts.siteUrl}/admin/settings`);
  if (alert.kind === "recovered") {
    const lines = ["✅ <b>Bakong payment checks work again</b>"];
    if (alert.since) lines.push(`They were failing since ${formatShortDateTime(alert.since)}.`);
    lines.push(
      "",
      "Orders that expired or were cancelled meanwhile are re-checked automatically (for up to 7 days); paid ones will alert here as usual.",
    );
    return { text: lines.join("\n"), replyMarkup: keyboard([[settings]]) };
  }
  return {
    text: [
      "🚨 <b>Bakong payment checks are failing</b>",
      `<i>${esc(clip(alert.message, 300))}</i>`,
      "",
      `Since ${formatShortDateTime(alert.since)} paid orders cannot be confirmed automatically, so customers who paid may see their order expire.`,
      bakongFixHint(alert.code),
      "",
      "Orders are re-checked automatically for up to 7 days once checks work again; older ones need <b>Mark paid</b> in the admin panel. This alert repeats hourly while checks keep failing.",
    ].join("\n"),
    replyMarkup: keyboard([[settings]]),
  };
}

// ───────────────────────────── admin: queue, stats, help ─────────────────────────────

export type AdminQueueItem = Pick<Order, "code" | "status" | "gameName" | "packageName" | "totalCents" | "createdAt"> & {
  paidAt: Date | null;
};

const QUEUE_BUTTONS = 10;

/** /orders: paid / processing / failed orders, longest-waiting first, with tap-to-open buttons. */
export function buildAdminQueue(
  items: AdminQueueItem[],
  total: number,
  opts: { siteUrl: string; now?: Date },
): BotMessage {
  const now = opts.now ?? new Date();
  if (items.length === 0) {
    return { text: "🎉 <b>Nothing to deliver</b> — all caught up!" };
  }
  const lines = [`📋 <b>Orders to handle</b> · ${total}`, ""];
  for (const o of items) {
    lines.push(
      `${STATUS_EMOJI[o.status]} ${code(o.code)} · ${esc(clip(o.gameName, 40))} · ${esc(clip(o.packageName, 40))} · <b>${formatUsd(o.totalCents)}</b> · ${formatAge(o.paidAt ?? o.createdAt, now)}`,
    );
  }
  if (total > items.length) lines.push("", `…and ${total - items.length} more in the admin panel.`);
  lines.push("", "Tap an order for details and ✅/❌ buttons.");

  const buttons = items
    .slice(0, QUEUE_BUTTONS)
    .map((o): InlineKeyboardButton => ({ text: `${STATUS_EMOJI[o.status]} ${o.code}`, callback_data: orderCallbackData("view", o.code) }));
  const rows: (InlineKeyboardButton | null)[][] = [];
  for (let i = 0; i < buttons.length; i += 2) rows.push(buttons.slice(i, i + 2));
  rows.push([urlButton("Open orders in admin ↗", `${opts.siteUrl}/admin/orders`)]);
  return { text: lines.join("\n"), replyMarkup: keyboard(rows) };
}

export type AdminStats = {
  now: Date;
  paidOrdersToday: number;
  revenueTodayCents: number;
  awaitingDelivery: number;
  failed: number;
  revenue7dCents: number;
  /** Today's paid orders and revenue per marketing channel. */
  channels: { channel: string; paidOrders: number; revenueCents: number }[];
};

/** /stats: today's sales (Phnom Penh day) and which channel sold. */
export function buildAdminStats(s: AdminStats): string {
  const lines = [
    `📊 <b>Today</b> · ${formatDayKey(storeDateKey(s.now))} (Phnom Penh)`,
    "",
    `✅ Paid orders: <b>${s.paidOrdersToday}</b>`,
    `💵 Revenue: <b>${formatUsd(s.revenueTodayCents)}</b>`,
    `⏳ To deliver: <b>${s.awaitingDelivery}</b> · ❌ Failed: <b>${s.failed}</b>`,
  ];
  const selling = s.channels.filter((c) => c.paidOrders > 0).sort((a, b) => b.revenueCents - a.revenueCents);
  if (selling.length) {
    lines.push("", "<b>By channel today</b>");
    for (const c of selling) {
      lines.push(`${channelLabel(c.channel)} — ${c.paidOrders} paid · ${formatUsd(c.revenueCents)}`);
    }
  }
  lines.push("", `📈 Last 7 days: <b>${formatUsd(s.revenue7dCents)}</b>`);
  return lines.join("\n");
}

export function buildAdminHelp(): string {
  return [
    "🛠 <b>Admin commands</b>",
    "/orders — orders to deliver",
    "/order <code>CODE</code> — details with ✅/❌ buttons",
    "/stats — today's sales by channel",
    "/status <code>CODE</code> — what the customer sees",
    "/id — this chat's id",
    "",
    "New paid orders arrive here automatically with ✅ Delivered / ❌ Failed buttons. Top up the player first, then tap ✅.",
  ].join("\n");
}

export function buildChatIdText(chatId: number | string, isAdmin: boolean): string {
  return [
    `🆔 This chat's id: ${code(chatId)}`,
    isAdmin
      ? "✅ This is an admin chat: paid-order alerts arrive here."
      : "To receive paid-order alerts here, add this id to TELEGRAM_ADMIN_CHAT_IDS.",
  ].join("\n");
}

// ───────────────────────────── customer ─────────────────────────────

export type CustomerContext = {
  /** Site origin without trailing slash. */
  siteUrl: string;
  settings: Pick<Settings, "store" | "social" | "marketing">;
};

type CustomerOrder = Pick<
  Order,
  | "code"
  | "status"
  | "locale"
  | "gameSlug"
  | "gameName"
  | "packageName"
  | "playerId"
  | "zoneId"
  | "playerName"
  | "totalCents"
  | "promoCode"
>;

/** "<b>Nick</b> · ID <code>123</code> (1234)". */
function playerHtml(order: CustomerOrder): string {
  const id = `ID ${code(order.playerId)}${order.zoneId ? ` (${esc(order.zoneId)})` : ""}`;
  return order.playerName ? `<b>${esc(order.playerName)}</b> · ${id}` : id;
}

/** Support contacts from settings as HTML links, or null when none are set. */
function supportLinksHtml(settings: CustomerContext["settings"]): string | null {
  const chat = supportChatLinks(settings.store, settings.social);
  const parts: string[] = [];
  if (chat.telegram) parts.push(link(chat.telegram, telegramHandle(settings.store.supportTelegram) ?? "Telegram"));
  if (chat.messenger) parts.push(link(chat.messenger, "Messenger"));
  const phone = settings.store.supportPhone.trim();
  if (phone) parts.push(`☎️ ${esc(phone)}`);
  return parts.length ? parts.join(" · ") : null;
}

function supportButton(text: string, settings: CustomerContext["settings"]): InlineKeyboardButton | null {
  const chat = supportChatLinks(settings.store, settings.social);
  return urlButton(text, chat.telegram ?? chat.messenger);
}

/** Facebook/TikTok follow block for happy customers; null when no link is set. */
function followBlock(locale: Locale, ctx: CustomerContext): { lines: string[]; buttons: (InlineKeyboardButton | null)[] } | null {
  const s = botStrings(locale);
  const links = socialLinks(ctx.settings.social, ["facebook", "tiktok"]);
  if (!links.length) return null;
  const names = links.map((l) => link(l.url, l.network === "facebook" ? "Facebook" : "TikTok"));
  const lines = [fill(s.follow.ask, { networks: names.join(s.follow.and) })];
  const promo = ctx.settings.marketing.followPromoCode.trim().toUpperCase();
  if (promo) lines.push(fill(s.follow.promo, { code: esc(promo) }));
  const buttons = links.map((l) => urlButton(l.network === "facebook" ? s.buttons.facebook : s.buttons.tiktok, l.url));
  return { lines, buttons };
}

function viewOrderButton(order: CustomerOrder, ctx: CustomerContext): InlineKeyboardButton | null {
  const s = botStrings(localeOf(order));
  const text = order.status === "pending_payment" ? s.buttons.payNow : s.buttons.viewOrder;
  return urlButton(text, orderPageUrl(ctx.siteUrl, order.code));
}

function gameUrl(order: CustomerOrder, ctx: CustomerContext, campaign: string): string {
  return withUtm(`${ctx.siteUrl}/games/${encodeURIComponent(order.gameSlug)}`, {
    source: "telegram",
    medium: "bot",
    campaign,
  });
}

/** Customer-facing summary for /status and after linking. */
export function buildOrderSummary(order: CustomerOrder): string {
  const s = botStrings(localeOf(order));
  const promo = order.promoCode ? ` · ${esc(order.promoCode)}` : "";
  return [
    `🧾 ${s.labels.order} ${code(order.code)}`,
    `🎮 ${esc(order.gameName)} — <b>${esc(order.packageName)}</b>`,
    `👤 ${playerHtml(order)}`,
    `💵 <b>${formatUsd(order.totalCents)}</b>${promo}`,
    `📌 ${s.labels.status}: <b>${s.statusNames[order.status]}</b>`,
    `<i>${s.statusHints[order.status]}</i>`,
  ].join("\n");
}

/** /status <code> reply. */
export function buildCustomerStatus(order: CustomerOrder, ctx: CustomerContext): BotMessage {
  return { text: buildOrderSummary(order), replyMarkup: keyboard([[viewOrderButton(order, ctx)]]) };
}

/** Reply to /start ord_<code>: "You'll get updates here" + current status. */
export function buildCustomerLinked(order: CustomerOrder, ctx: CustomerContext): BotMessage {
  const s = botStrings(localeOf(order));
  return {
    text: [s.linked.title, fill(s.linked.body, { code: esc(order.code) }), "", buildOrderSummary(order)].join("\n"),
    replyMarkup: keyboard([[viewOrderButton(order, ctx)]]),
  };
}

export type CustomerUpdateKind = "paid" | "processing" | "delivered" | "failed" | "refunded" | "expired" | "cancelled";

/** Status push to a customer who linked their chat, in the order's language. */
export function buildCustomerUpdate(kind: CustomerUpdateKind, order: CustomerOrder, ctx: CustomerContext): BotMessage {
  const locale = localeOf(order);
  const s = botStrings(locale);
  const vars = {
    code: esc(order.code),
    package: `<b>${esc(order.packageName)}</b>`,
    player: playerHtml(order),
    game: esc(order.gameName),
  };
  const lines = [s.updates[kind].title, fill(s.updates[kind].body, vars)];
  const rows: (InlineKeyboardButton | null)[][] = [];

  switch (kind) {
    case "delivered": {
      rows.push([urlButton(s.buttons.topUpAgain, gameUrl(order, ctx, "reorder"))]);
      const follow = followBlock(locale, ctx);
      if (follow) {
        lines.push("", ...follow.lines);
        rows.push(follow.buttons);
      }
      break;
    }
    case "failed":
    case "refunded":
    case "expired": {
      const contacts = supportLinksHtml(ctx.settings);
      if (contacts) lines.push("", fill(s.contact, { links: contacts }));
      rows.push([viewOrderButton(order, ctx)], [supportButton(s.buttons.support, ctx.settings)]);
      break;
    }
    case "cancelled":
      rows.push([urlButton(s.buttons.orderAgain, gameUrl(order, ctx, "cancelled"))]);
      break;
    default:
      rows.push([viewOrderButton(order, ctx)]);
  }
  return { text: lines.join("\n"), replyMarkup: keyboard(rows) };
}

/** Channels customers can name in a bot link (t.me/<bot>?start=tiktok) from a bio or post. */
const START_SOURCES: Record<string, string> = {
  facebook: "facebook",
  fb: "facebook",
  instagram: "instagram",
  ig: "instagram",
  tiktok: "tiktok",
  tt: "tiktok",
  youtube: "youtube",
  yt: "youtube",
};

/** UTM for the website link in /start: a known channel payload keeps the real source. */
export function startUtm(payload: string | null | undefined): { source: string; medium: string; campaign?: string } {
  const key = (payload ?? "").toLowerCase();
  const source = START_SOURCES[key];
  return source ? { source, medium: "telegram_bot" } : { source: "telegram", medium: "bot", campaign: "start" };
}

/** /start without an order: welcome, website link, how to link an order. */
export function buildWelcome(locale: Locale, ctx: CustomerContext, opts: { payload?: string | null } = {}): BotMessage {
  const s = botStrings(locale);
  const { store } = ctx.settings;
  const siteLink = withUtm(`${ctx.siteUrl}/`, startUtm(opts.payload));
  let host = ctx.siteUrl;
  try {
    host = new URL(ctx.siteUrl).host;
  } catch {
    // keep the raw value
  }
  const tagline = clip(store.tagline[locale] || store.tagline.en, 200);
  const lines = [fill(s.welcome.title, { store: esc(store.name) })];
  if (tagline) lines.push(`<i>${esc(tagline)}</i>`);
  lines.push(s.welcome.pay, "", fill(s.welcome.order, { site: link(siteLink, host) }), "", s.welcome.updates);

  const follow = socialLinks(ctx.settings.social, ["facebook", "tiktok"]).map((l) =>
    urlButton(l.network === "facebook" ? s.buttons.facebook : s.buttons.tiktok, l.url),
  );
  return { text: lines.join("\n"), replyMarkup: keyboard([[urlButton(s.buttons.website, siteLink)], follow]) };
}

export function buildCustomerHelp(locale: Locale): string {
  return botStrings(locale).help;
}

/** /status without a code: the orders this chat has linked. */
export function buildRecentOrders(orders: CustomerOrder[], locale: Locale): string {
  const s = botStrings(locale);
  const lines = [s.status.recent, ""];
  for (const o of orders) {
    lines.push(
      `${STATUS_EMOJI[o.status]} ${code(o.code)} · ${esc(clip(o.gameName, 40))} · ${esc(clip(o.packageName, 40))} — <b>${s.statusNames[o.status]}</b>`,
    );
  }
  lines.push("", s.status.recentHint);
  return lines.join("\n");
}

/** Pick the bot language from Telegram's language_code (km → Khmer, else English). */
export function localeFromTelegram(languageCode: string | null | undefined): Locale {
  return languageCode?.toLowerCase().startsWith("km") ? "km" : "en";
}
