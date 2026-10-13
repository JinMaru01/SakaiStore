import "server-only";
import { and, asc, eq, gt, inArray, isNotNull, isNull, lt, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  orderEvents,
  orders,
  promoCodes,
  type NewOrder,
  type Order,
  type OrderEvent,
  type OrderStatus,
  type PromoCode,
} from "@/db/schema";
import type { Locale } from "@/i18n/config";
import { CHANNELS, classifyChannel, type Attribution, type Channel } from "@/lib/attribution";
import { getGameBySlug, getPackageForGame, type GameWithPackages } from "@/lib/catalog";
import { startFulfillment } from "@/lib/fulfillment";
import { notifyOrderPaid, notifyOrderStatusChanged } from "@/lib/notify";
import {
  checkPayment,
  createPayment,
  getPaymentMode,
  type CreatedPayment,
  type PaymentCheckResult,
} from "@/lib/payments";
import { recordBakongCheck } from "@/lib/payments/health";
import { lookupPlayer } from "@/lib/players/lookup";
import { formatUsd } from "@/lib/utils";
import { generateOrderCode, normalizeOrderCode } from "./code";
import { evaluatePromo, normalizePromoCode, type PromoError, type PromoEvaluation } from "./pricing";
import { evaluatePromoForOrder, findPromoByCode, lockPromoForOrder } from "./promos";
import { allowedFrom, canTransition } from "./status";
import { validatePlayer } from "./validation";

/**
 * The order service: the ONLY place that creates orders or changes their
 * status. Every transition is a conditional UPDATE
 *   UPDATE orders SET status = $to … WHERE id = $id AND status IN (allowedFrom($to)) RETURNING *
 * inside a transaction that also writes the order_events row (and, for
 * payments, the promo usage). Only the caller whose UPDATE returned a row runs
 * side effects (notifications, fulfillment), so payment polling, the cron,
 * Telegram buttons and admin clicks can race safely.
 */

export type Actor = "system" | "admin" | "telegram" | "customer";

export type CreateOrderInput = {
  gameSlug: string;
  packageId: number;
  playerId: string;
  zoneId?: string | null;
  /** Nickname shown by the lookup on the form. Only used if the server-side lookup is unavailable. */
  playerName?: string | null;
  promoCode?: string | null;
  contactPhone?: string | null;
  contactTelegram?: string | null;
};

export type CreateOrderContext = {
  /** Decoded last non-direct-touch attribution from the `sk_attr` cookie. */
  attribution?: Attribution | null;
  ipHash?: string | null;
  userAgent?: string | null;
  locale?: Locale | null;
  now?: Date;
};

export type OrderErrorCode =
  | "invalid_request"
  | "invalid_id"
  | "invalid_zone"
  | "game_not_found"
  | "package_not_found"
  | `promo_${PromoError}`
  | "payment_unavailable";

/**
 * Expected, customer-facing failure of createOrder. Routes map it to
 * `{ error: code, field?, ...details }` (details: e.g. `minOrderCents` for promo_min_order).
 */
export class OrderError extends Error {
  readonly code: OrderErrorCode;
  readonly status: number;
  readonly field?: string;
  readonly details?: Record<string, unknown>;
  constructor(code: OrderErrorCode, status = 400, field?: string, details?: Record<string, unknown>) {
    super(code);
    this.name = "OrderError";
    this.code = code;
    this.status = status;
    this.field = field;
    this.details = details;
  }
}

/** promo_<error> on the promoCode field; min_order also says what the minimum is. */
function promoOrderError(evaluation: Extract<PromoEvaluation, { ok: false }>): OrderError {
  const details = evaluation.minOrderCents != null ? { minOrderCents: evaluation.minOrderCents } : undefined;
  return new OrderError(`promo_${evaluation.error}`, 400, "promoCode", details);
}

export function isOrderError(err: unknown): err is OrderError {
  return err instanceof OrderError;
}

/** Poll throttle: at most one provider check per order per interval. */
export const PAYMENT_CHECK_INTERVAL_MS = 4_000;
/**
 * An order stays pending_payment this long past paymentExpiresAt (the order
 * page shows "QR expired — checking for your payment…"), so a payment made in
 * the last seconds is confirmed instead of the order expiring. Then the next
 * definitive "unpaid" check expires it (polling and cron alike).
 */
export const EXPIRY_GRACE_MS = 60_000;
/**
 * …but no longer than this when no check gets an answer (Bakong outage): the
 * order expires anyway and is re-checked later as a late payment.
 */
export const EXPIRY_HARD_CAP_MS = 10 * 60_000;
/** Expired orders are re-checked for late payments for this long after their QR expired… */
export const LATE_PAYMENT_WINDOW_MS = 24 * 60 * 60_000;
/** …cancelled orders for this long (their QR stays payable until it expires)… */
export const CANCELLED_PAYMENT_WINDOW_MS = 60 * 60_000;
/** …and orders whose final check never got an answer (provider outage) for this long. */
export const UNCONFIRMED_PAYMENT_WINDOW_MS = 7 * 24 * 60 * 60_000;
/**
 * Late re-checks back off with age: every 10 min in the first hour after the
 * QR expired, every 30 min until 6 h (or while the final check is still
 * missing), then every 2 h.
 */
export const LATE_PAYMENT_RECHECK_MS = 10 * 60_000;
export const LATE_PAYMENT_RECHECK_SLOW_MS = 30 * 60_000;
export const LATE_PAYMENT_RECHECK_SLOWEST_MS = 2 * 60 * 60_000;
/** Provider checks per cron run (pending orders first; see reconcilePendingPayments). */
export const RECONCILE_LIMIT = 60;

const MAX_CODE_ATTEMPTS = 5;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CONTROL_CHARS = /[\u0000-\u001f\u007f]/g;

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ───────────────────────────── helpers ─────────────────────────────

function clean(value: string | null | undefined, max: number): string | null {
  if (typeof value !== "string") return null;
  const v = value.replace(CONTROL_CHARS, "").trim().slice(0, max);
  return v || null;
}

function isChannel(v: unknown): v is Channel {
  return typeof v === "string" && (CHANNELS as readonly string[]).includes(v);
}

/** Postgres unique violation (23505), optionally on a specific constraint; drizzle wraps pg errors in `cause`. */
function isUniqueViolation(err: unknown, constraint?: string): boolean {
  for (let e = err as { code?: string; constraint?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === "23505") return !constraint || e.constraint === constraint;
  }
  return false;
}

async function safeNotifyStatus(order: Order, previous: OrderStatus): Promise<void> {
  try {
    await notifyOrderStatusChanged(order, previous);
  } catch (err) {
    console.error(`[orders] notifyOrderStatusChanged failed for ${order.code}`, err);
  }
}

// ───────────────────────────── reads ─────────────────────────────

export async function getOrderByCode(code: string): Promise<Order | null> {
  const normalized = normalizeOrderCode(code);
  if (!normalized) return null;
  const [order] = await db.select().from(orders).where(eq(orders.code, normalized)).limit(1);
  return order ?? null;
}

export async function getOrderById(id: string): Promise<Order | null> {
  if (!UUID_RE.test(id)) return null;
  const [order] = await db.select().from(orders).where(eq(orders.id, id)).limit(1);
  return order ?? null;
}

export async function listOrderEvents(orderId: string): Promise<OrderEvent[]> {
  if (!UUID_RE.test(orderId)) return [];
  return db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.orderId, orderId))
    .orderBy(asc(orderEvents.createdAt), asc(orderEvents.id));
}

// ───────────────────────────── create ─────────────────────────────

/** Nickname to store: the server-side lookup wins; the client's value is only a fallback when the provider is down. */
async function resolvePlayerName(
  game: GameWithPackages,
  playerId: string,
  zoneId: string | null,
  clientName: string | null | undefined,
): Promise<string | null> {
  const lookup = await lookupPlayer(game, playerId, zoneId);
  if (lookup.ok) return clean(lookup.playerName, 120);
  if (lookup.error === "unavailable") return clean(clientName, 120);
  // not_found / invalid_id: wrong account — refuse before the customer pays.
  throw new OrderError("invalid_id", 400, "playerId");
}

/**
 * Validate the request against the catalog, price it server-side, build the
 * KHQR and insert the order + "created" event atomically. Throws OrderError
 * for anything the customer can fix.
 *
 * A promo code is checked twice: once up front for a fast answer, and again
 * inside the insert transaction with the promo row locked (FOR UPDATE). The
 * second check counts the uses held by unexpired pending orders (maxUses) and
 * the player's earlier orders (firstOrderOnly), so concurrent checkouts are
 * serialized per code and cannot both take the last use.
 */
export async function createOrder(input: CreateOrderInput, ctx: CreateOrderContext = {}): Promise<Order> {
  const now = ctx.now ?? new Date();

  const game = typeof input.gameSlug === "string" ? await getGameBySlug(input.gameSlug) : null;
  if (!game) throw new OrderError("game_not_found", 400, "gameSlug");
  const pkg = await getPackageForGame(game.id, Number(input.packageId));
  if (!pkg) throw new OrderError("package_not_found", 400, "packageId");

  const player = validatePlayer(game, input.playerId, input.zoneId);
  if (!player.ok) throw new OrderError(player.error, 400, player.field);
  const playerName = await resolvePlayerName(game, player.playerId, player.zoneId, input.playerName);

  // Pricing is always recomputed from the DB; nothing price-related comes from the client.
  const subtotalCents = pkg.priceCents;
  let promoId: number | null = null;
  if (normalizePromoCode(input.promoCode)) {
    const promo = await findPromoByCode(input.promoCode);
    const quick = evaluatePromo(promo, { subtotalCents, gameId: game.id, now });
    if (!quick.ok) throw promoOrderError(quick);
    promoId = promo!.id;
  }

  const attribution = ctx.attribution ?? null;
  const base: Omit<
    NewOrder,
    "code" | "khqr" | "khqrMd5" | "paymentExpiresAt" | "discountCents" | "totalCents" | "promoCodeId" | "promoCode" | "channel"
  > = {
    status: "pending_payment",
    gameId: game.id,
    packageId: pkg.id,
    gameSlug: game.slug,
    gameName: game.name,
    packageName: pkg.name,
    playerId: player.playerId,
    zoneId: player.zoneId,
    playerName,
    unitPriceCents: subtotalCents,
    currency: "USD",
    paymentMethod: "khqr",
    contactPhone: clean(input.contactPhone, 32),
    contactTelegram: clean(input.contactTelegram, 64)?.replace(/^@/, "") || null,
    locale: ctx.locale === "km" ? "km" : "en",
    utmSource: clean(attribution?.utmSource, 120),
    utmMedium: clean(attribution?.utmMedium, 120),
    utmCampaign: clean(attribution?.utmCampaign, 120),
    utmContent: clean(attribution?.utmContent, 120),
    utmTerm: clean(attribution?.utmTerm, 120),
    clickId: clean(attribution?.clickId, 255),
    referrer: clean(attribution?.referrer, 500),
    landingPath: clean(attribution?.landingPath, 500),
    ipHash: clean(ctx.ipHash, 64),
    userAgent: clean(ctx.userAgent, 300),
  };

  for (let attempt = 1; ; attempt++) {
    const code = generateOrderCode();
    try {
      return await db.transaction(async (tx) => {
        // Authoritative promo check: row locked until commit, reservations counted.
        let promo: PromoCode | null = null;
        let discountCents = 0;
        if (promoId != null) {
          promo = await lockPromoForOrder(tx, promoId);
          const evaluation = await evaluatePromoForOrder(
            promo,
            { subtotalCents, gameId: game.id, now, player: { playerId: player.playerId, zoneId: player.zoneId } },
            tx,
          );
          if (!evaluation.ok) throw promoOrderError(evaluation);
          discountCents = evaluation.discountCents;
        }
        const totalCents = subtotalCents - discountCents;

        let payment: CreatedPayment;
        try {
          payment = createPayment({ code, totalCents, now });
        } catch (err) {
          console.error("[orders] cannot build KHQR; check BAKONG_* settings", err);
          throw new OrderError("payment_unavailable", 503);
        }

        // Channel: last non-direct-touch attribution; a channel promo code (e.g. TIKTOK5) explains "direct" visits.
        let channel: Channel = classifyChannel(attribution);
        if (channel === "direct" && promo && isChannel(promo.channel)) channel = promo.channel;

        const [order] = await tx
          .insert(orders)
          .values({
            ...base,
            code,
            discountCents,
            totalCents,
            promoCodeId: promo?.id ?? null,
            promoCode: promo?.code ?? null,
            channel,
            khqr: payment.khqr,
            khqrMd5: payment.md5,
            paymentExpiresAt: payment.expiresAt,
          })
          .returning();
        await tx.insert(orderEvents).values({
          orderId: order!.id,
          type: "created",
          actor: "customer",
          message: `${pkg.name} for ${formatUsd(totalCents)}${promo ? ` (promo ${promo.code})` : ""}`,
          data: { channel, promoCode: promo?.code ?? null, subtotalCents, discountCents, totalCents },
        });
        return order!;
      });
    } catch (err) {
      // Astronomically rare, but a duplicate code must not fail checkout.
      if (attempt < MAX_CODE_ATTEMPTS && isUniqueViolation(err, "orders_code_unique")) continue;
      throw err;
    }
  }
}

// ───────────────────────────── transitions ─────────────────────────────

type TransitionOpts = {
  actor: Actor;
  /** Event message; may depend on the status we transitioned from. */
  message?: string | null | ((previous: OrderStatus) => string | null);
  data?: Record<string, unknown> | null;
  /** Extra columns to set together with the status. */
  set?: Partial<Omit<NewOrder, "id" | "status">>;
  /** Runs in the same transaction, only when the transition happened. */
  afterUpdate?: (tx: Tx, order: Order, previous: OrderStatus) => Promise<void>;
};

type TransitionResult = { order: Order; previous: OrderStatus };

/**
 * Apply one status transition atomically. The row lock lets us report the
 * real previous status to notifications; the conditional UPDATE is what
 * guarantees the transition is legal and applied at most once.
 */
async function transition(orderId: string, to: OrderStatus, opts: TransitionOpts): Promise<TransitionResult | null> {
  if (!UUID_RE.test(orderId)) return null;
  return db.transaction(async (tx) => {
    const [current] = await tx
      .select({ status: orders.status })
      .from(orders)
      .where(eq(orders.id, orderId))
      .for("update");
    if (!current || !canTransition(current.status, to)) return null;

    const [order] = await tx
      .update(orders)
      .set({ ...opts.set, status: to })
      .where(and(eq(orders.id, orderId), inArray(orders.status, allowedFrom(to))))
      .returning();
    if (!order) return null;

    const message = typeof opts.message === "function" ? opts.message(current.status) : opts.message;
    await tx.insert(orderEvents).values({
      orderId,
      type: to,
      actor: opts.actor,
      message: message ?? null,
      data: opts.data ?? null,
    });
    await opts.afterUpdate?.(tx, order, current.status);
    return { order, previous: current.status };
  });
}

/** Transition + customer/admin notification (for every status except "paid"). */
async function transitionAndNotify(orderId: string, to: OrderStatus, opts: TransitionOpts): Promise<Order | null> {
  const result = await transition(orderId, to, opts);
  if (!result) return null;
  await safeNotifyStatus(result.order, result.previous);
  return result.order;
}

/**
 * Payment confirmed (provider check, simulate endpoint, or admin). Allowed
 * from pending_payment and expired (late payment). Idempotent: concurrent
 * callers get exactly one non-null result, one "paid" event and one promo use.
 * Returns the order after fulfillment has started.
 */
export async function markOrderPaid(
  orderId: string,
  p: { ref?: string; payload?: unknown; actor: Actor },
): Promise<Order | null> {
  const ref = clean(p.ref, 128);
  const result = await transition(orderId, "paid", {
    actor: p.actor,
    message: (previous) =>
      `${previous === "expired" ? "Late payment received after expiry" : "Payment received"}${ref ? ` (ref ${ref})` : ""}`,
    data: { ref },
    set: { paidAt: new Date(), paymentRef: ref, paymentPayload: p.payload ?? null },
    afterUpdate: async (tx, order) => {
      // Counted when PAID (not when created) so abandoned checkouts don't burn limited codes.
      if (order.promoCodeId != null) {
        await tx
          .update(promoCodes)
          .set({ usedCount: sql`${promoCodes.usedCount} + 1` })
          .where(eq(promoCodes.id, order.promoCodeId));
      }
    },
  });
  if (!result) return null;
  try {
    await notifyOrderPaid(result.order);
  } catch (err) {
    console.error(`[orders] notifyOrderPaid failed for ${result.order.code}`, err);
  }
  return startFulfillment(result.order);
}

export async function markOrderProcessing(
  orderId: string,
  p: { actor: Actor; message?: string },
): Promise<Order | null> {
  return transitionAndNotify(orderId, "processing", { actor: p.actor, message: clean(p.message, 2000) });
}

export async function markOrderDelivered(
  orderId: string,
  p: { actor: Actor; message?: string },
): Promise<Order | null> {
  return transitionAndNotify(orderId, "delivered", {
    actor: p.actor,
    message: clean(p.message, 2000),
    set: { deliveredAt: new Date() },
  });
}

export async function markOrderFailed(
  orderId: string,
  p: { actor: Actor; reason: string },
): Promise<Order | null> {
  return transitionAndNotify(orderId, "failed", { actor: p.actor, message: clean(p.reason, 2000) });
}

export async function markOrderRefunded(
  orderId: string,
  p: { actor: Actor; message?: string },
): Promise<Order | null> {
  return transitionAndNotify(orderId, "refunded", { actor: p.actor, message: clean(p.message, 2000) });
}

/**
 * Cancel an unpaid order. In bakong mode we first ask Bakong whether it was
 * paid in the meantime: cancelled is final, so cancelling a paid order would
 * lose the customer's money. If the check fails we refuse (return null) — the
 * order simply expires instead.
 */
export async function cancelOrder(
  orderId: string,
  p: { actor: Actor; reason?: string },
): Promise<Order | null> {
  const order = await getOrderById(orderId);
  if (!order || order.status !== "pending_payment") return null;
  if (getPaymentMode() === "bakong" && order.khqrMd5) {
    const check = await checkPayment(order);
    if (check.status === "paid") {
      await markOrderPaid(order.id, { ref: check.ref ?? undefined, payload: check.payload, actor: "system" });
      return null;
    }
    if (check.status === "error") {
      console.warn(`[orders] not cancelling ${order.code}: payment status unknown (${check.message})`);
      return null;
    }
  }
  return transitionAndNotify(orderId, "cancelled", {
    actor: p.actor,
    message: clean(p.reason, 2000) ?? (p.actor === "customer" ? "Cancelled by customer" : "Cancelled"),
  });
}

/** Internal/admin note on the timeline. Never shown to customers. */
export async function addOrderNote(orderId: string, p: { actor: Actor; message: string }): Promise<void> {
  const message = clean(p.message, 2000);
  if (!message || !UUID_RE.test(orderId)) return;
  await db.insert(orderEvents).values({ orderId, type: "note", actor: p.actor, message });
}

/**
 * Remember the customer's Telegram chat (from /start ord_<code>) for status
 * pushes. Idempotent: re-linking the same chat adds no new event.
 */
export async function linkCustomerTelegram(code: string, chatId: string): Promise<Order | null> {
  const normalized = normalizeOrderCode(code);
  const chat = String(chatId ?? "").trim();
  if (!normalized || !/^-?\d{1,20}$/.test(chat)) return null;
  const linked = await db.transaction(async (tx) => {
    const [order] = await tx
      .update(orders)
      .set({ customerTelegramChatId: chat })
      .where(
        and(
          eq(orders.code, normalized),
          or(isNull(orders.customerTelegramChatId), ne(orders.customerTelegramChatId, chat)),
        ),
      )
      .returning();
    if (!order) return null;
    await tx.insert(orderEvents).values({
      orderId: order.id,
      type: "notify",
      actor: "telegram",
      message: "Customer linked Telegram for order updates",
      data: { chatId: chat },
    });
    return order;
  });
  return linked ?? getOrderByCode(normalized);
}

// ───────────────────────────── payment polling & cron ─────────────────────────────

/**
 * Atomically claim the right to ask the provider about this order now. Only
 * one concurrent poller wins, and each order is checked at most once per
 * `minIntervalMs` — plus one guaranteed final check after the payment window
 * closes, even if a check ran moments before it closed.
 */
async function claimPaymentCheck(
  orderId: string,
  status: "pending_payment" | "expired",
  now: Date,
  minIntervalMs: number,
): Promise<Order | null> {
  const threshold = new Date(now.getTime() - minIntervalMs);
  const [order] = await db
    .update(orders)
    .set({ lastPaymentCheckAt: now })
    .where(
      and(
        eq(orders.id, orderId),
        eq(orders.status, status),
        or(
          isNull(orders.lastPaymentCheckAt),
          lt(orders.lastPaymentCheckAt, threshold),
          status === "pending_payment"
            ? and(lte(orders.paymentExpiresAt, now), lt(orders.lastPaymentCheckAt, orders.paymentExpiresAt))
            : undefined,
        ),
      ),
    )
    .returning();
  return order ?? null;
}

async function expireOrder(orderId: string): Promise<Order | null> {
  return transitionAndNotify(orderId, "expired", { actor: "system", message: "Payment window expired" });
}

/**
 * Called by GET /api/orders/[code] (customer page polling). For pending
 * orders: ask the provider (throttled), mark paid when confirmed, and expire
 * the order once the payment window has closed and a final check found
 * nothing. Returns the latest known order; never throws on provider errors.
 */
export async function refreshOrderPayment(order: Order): Promise<Order> {
  if (order.status !== "pending_payment") return order;
  const now = new Date();
  const pastExpiry = !!order.paymentExpiresAt && order.paymentExpiresAt.getTime() <= now.getTime();

  const claimed = await claimPaymentCheck(order.id, "pending_payment", now, PAYMENT_CHECK_INTERVAL_MS);
  if (!claimed) return order; // another request checked moments ago

  const check = await checkPayment(claimed);
  if (check.status === "paid") {
    const paid = await markOrderPaid(order.id, {
      ref: check.ref ?? undefined,
      payload: check.payload,
      actor: "system",
    });
    return paid ?? (await getOrderById(order.id)) ?? claimed;
  }
  if (check.status === "error") {
    console.warn(`[orders] payment check failed for ${order.code}: ${check.message}`);
  }
  if (pastExpiry) {
    // A payment that lands later is still caught by reconcilePendingPayments (expired → paid).
    return (await expireOrder(order.id)) ?? (await getOrderById(order.id)) ?? claimed;
  }
  return claimed;
}

/** Cron: expire unpaid orders whose payment window closed (with a grace period). Returns how many. */
export async function expireStaleOrders(now: Date = new Date(), graceMs: number = EXPIRY_GRACE_MS): Promise<number> {
  const cutoff = new Date(now.getTime() - graceMs);
  const expired = await db.transaction(async (tx) => {
    const stale = tx
      .select({ id: orders.id })
      .from(orders)
      .where(and(eq(orders.status, "pending_payment"), lt(orders.paymentExpiresAt, cutoff)))
      .limit(500)
      // Rows being paid/cancelled right now are skipped, not waited on.
      .for("update", { skipLocked: true });
    const rows = await tx
      .update(orders)
      .set({ status: "expired" })
      .where(and(inArray(orders.id, stale), inArray(orders.status, allowedFrom("expired"))))
      .returning();
    if (rows.length > 0) {
      await tx.insert(orderEvents).values(
        rows.map((o) => ({
          orderId: o.id,
          type: "expired",
          actor: "system",
          message: "Payment window expired",
        })),
      );
    }
    return rows;
  });
  for (const order of expired) await safeNotifyStatus(order, "pending_payment");
  return expired.length;
}

const RECONCILE_CONCURRENCY = 5;
const RECONCILE_TIME_BUDGET_MS = 20_000;

/**
 * Cron: catch payments nobody polled for (customer closed the page after
 * paying) — pending orders, and expired orders within LATE_PAYMENT_WINDOW_MS
 * (late payments). Oldest-checked first, throttled per order.
 */
export async function reconcilePendingPayments(limit = 25): Promise<{ checked: number; paid: number }> {
  const now = new Date();
  const started = Date.now();
  const pendingThreshold = new Date(now.getTime() - PAYMENT_CHECK_INTERVAL_MS);
  const lateThreshold = new Date(now.getTime() - LATE_PAYMENT_RECHECK_MS);
  const lateWindowStart = new Date(now.getTime() - LATE_PAYMENT_WINDOW_MS);
  const safeLimit = Math.max(1, Math.min(200, Math.floor(limit) || 25));

  const candidates = await db
    .select({ id: orders.id, status: orders.status })
    .from(orders)
    .where(
      and(
        isNotNull(orders.khqrMd5),
        or(
          and(
            eq(orders.status, "pending_payment"),
            or(isNull(orders.lastPaymentCheckAt), lt(orders.lastPaymentCheckAt, pendingThreshold)),
          ),
          and(
            eq(orders.status, "expired"),
            gt(orders.paymentExpiresAt, lateWindowStart),
            or(isNull(orders.lastPaymentCheckAt), lt(orders.lastPaymentCheckAt, lateThreshold)),
          ),
        ),
      ),
    )
    .orderBy(sql`${orders.lastPaymentCheckAt} asc nulls first`, asc(orders.createdAt))
    .limit(safeLimit);

  let checked = 0;
  let paid = 0;
  for (let i = 0; i < candidates.length; i += RECONCILE_CONCURRENCY) {
    if (Date.now() - started > RECONCILE_TIME_BUDGET_MS) break; // stay inside serverless time limits
    await Promise.all(
      candidates.slice(i, i + RECONCILE_CONCURRENCY).map(async ({ id, status }) => {
        try {
          const late = status === "expired";
          const claimed = await claimPaymentCheck(
            id,
            late ? "expired" : "pending_payment",
            now,
            late ? LATE_PAYMENT_RECHECK_MS : PAYMENT_CHECK_INTERVAL_MS,
          );
          if (!claimed) return;
          checked++;
          const check = await checkPayment(claimed);
          if (check.status === "paid") {
            const updated = await markOrderPaid(id, {
              ref: check.ref ?? undefined,
              payload: check.payload,
              actor: "system",
            });
            if (updated) paid++;
          } else if (check.status === "error") {
            console.warn(`[orders] reconcile check failed for ${claimed.code}: ${check.message}`);
          }
        } catch (err) {
          console.error(`[orders] reconcile failed for order ${id}`, err);
        }
      }),
    );
  }
  return { checked, paid };
}
