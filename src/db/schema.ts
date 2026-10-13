import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// Relative import (not "@/…") so drizzle-kit and tsx scripts resolve it without path aliases.
import { ORDER_STATUSES, type OrderStatus } from "../lib/orders/statuses";

export { ORDER_STATUSES };
export type { OrderStatus };

export const orderStatusEnum = pgEnum("order_status", ORDER_STATUSES);
export const promoTypeEnum = pgEnum("promo_type", ["percent", "fixed"]);

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

/** A game we sell top-ups for (Mobile Legends, Free Fire, ...). */
export const games = pgTable(
  "games",
  {
    id: serial("id").primaryKey(),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    name: varchar("name", { length: 120 }).notNull(),
    publisher: varchar("publisher", { length: 120 }),
    /** One-liner shown on cards. */
    tagline: text("tagline"),
    /** Khmer tagline; the storefront falls back to `tagline` when empty. */
    taglineKm: text("tagline_km"),
    description: text("description"),
    descriptionKm: text("description_km"),
    /** What the in-game currency is called: Diamonds, UC, CP, Tokens... */
    currencyName: varchar("currency_name", { length: 40 }).notNull().default("Diamonds"),
    /** Optional cover/logo image URL. When null the UI renders a generated tile. */
    imageUrl: text("image_url"),
    /** Brand accent used for generated tiles, promo images and OG images. */
    accentColor: varchar("accent_color", { length: 16 }).notNull().default("#7c5cff"),
    /** Label for the player id field, e.g. "User ID", "Player ID", "UID". */
    idLabel: varchar("id_label", { length: 40 }).notNull().default("User ID"),
    /** Regex (string) the player id must match, e.g. ^\d{6,12}$ */
    idPattern: varchar("id_pattern", { length: 160 }),
    /** Help text: where to find the id in-game. */
    idHelp: text("id_help"),
    /** Khmer version of idHelp (falls back to idHelp). */
    idHelpKm: text("id_help_km"),
    /** MLBB-style games need a second "Zone ID"/"Server" value. */
    requiresZone: boolean("requires_zone").notNull().default(false),
    zoneLabel: varchar("zone_label", { length: 40 }),
    zonePattern: varchar("zone_pattern", { length: 160 }),
    /** If set, zone is chosen from a dropdown (e.g. Genshin servers). */
    zoneOptions: jsonb("zone_options").$type<{ value: string; label: string }[] | null>(),
    /** Hashtags appended to generated social captions, e.g. "#MLBB #MobileLegends". */
    hashtags: text("hashtags"),
    featured: boolean("featured").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("games_active_sort_idx").on(t.active, t.sortOrder)],
);

/** A purchasable top-up package for a game (e.g. "86 Diamonds"). Prices are USD cents. */
export const packages = pgTable(
  "packages",
  {
    id: serial("id").primaryKey(),
    gameId: integer("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 120 }).notNull(),
    /** Base in-game amount (0 for passes/memberships). */
    amount: integer("amount").notNull().default(0),
    /** Bonus amount on top of `amount`. */
    bonus: integer("bonus").notNull().default(0),
    priceCents: integer("price_cents").notNull(),
    /** Optional "was" price for strike-through promos. */
    compareAtCents: integer("compare_at_cents"),
    /** Optional badge: "hot" | "best" | "new" | "promo" (free text allowed). */
    badge: varchar("badge", { length: 24 }),
    /** Supplier product code for API fulfillment (future use). */
    supplierSku: varchar("supplier_sku", { length: 64 }),
    active: boolean("active").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [index("packages_game_idx").on(t.gameId, t.sortOrder)],
);

/** Discount codes, optionally tied to a marketing channel (facebook/tiktok/...). */
export const promoCodes = pgTable("promo_codes", {
  id: serial("id").primaryKey(),
  /** Always stored UPPERCASE. */
  code: varchar("code", { length: 32 }).notNull().unique(),
  description: text("description"),
  /** Khmer description shown to customers in km mode (falls back to description). */
  descriptionKm: text("description_km"),
  type: promoTypeEnum("type").notNull(),
  /** percent: 1-100. fixed: USD cents. */
  value: integer("value").notNull(),
  /** Cap for percent discounts, in cents. */
  maxDiscountCents: integer("max_discount_cents"),
  minOrderCents: integer("min_order_cents").notNull().default(0),
  /**
   * null = unlimited. usedCount is incremented when an order using it is PAID;
   * unexpired pending orders also hold a use while they await payment, so the
   * cap cannot be exceeded by opening many orders at once.
   */
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  /** Only valid for a player's first paid order of the game (same player id + zone). */
  firstOrderOnly: boolean("first_order_only").notNull().default(false),
  /** Restrict to one game (null = all games). */
  gameId: integer("game_id").references(() => games.id, { onDelete: "set null" }),
  /** Marketing channel this code is promoted on: facebook | tiktok | telegram | other. */
  channel: varchar("channel", { length: 24 }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** A customer order. Game/package names and prices are snapshotted at creation. */
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Public, human-friendly order code, e.g. "SK7F3K9Q2M". */
    code: varchar("code", { length: 16 }).notNull().unique(),
    status: orderStatusEnum("status").notNull().default("pending_payment"),

    gameId: integer("game_id").references(() => games.id, { onDelete: "set null" }),
    packageId: integer("package_id").references(() => packages.id, { onDelete: "set null" }),
    gameSlug: varchar("game_slug", { length: 64 }).notNull(),
    gameName: varchar("game_name", { length: 120 }).notNull(),
    packageName: varchar("package_name", { length: 120 }).notNull(),

    playerId: varchar("player_id", { length: 64 }).notNull(),
    zoneId: varchar("zone_id", { length: 32 }),
    /** Nickname returned by the player lookup provider, if any. */
    playerName: varchar("player_name", { length: 120 }),

    unitPriceCents: integer("unit_price_cents").notNull(),
    discountCents: integer("discount_cents").notNull().default(0),
    totalCents: integer("total_cents").notNull(),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    promoCodeId: integer("promo_code_id").references(() => promoCodes.id, {
      onDelete: "set null",
    }),
    promoCode: varchar("promo_code", { length: 32 }),

    // ── Payment (KHQR) ──
    paymentMethod: varchar("payment_method", { length: 24 }).notNull().default("khqr"),
    /** The raw KHQR string rendered as a QR code. */
    khqr: text("khqr"),
    /** md5 of the KHQR string; used to query Bakong for payment status. */
    khqrMd5: varchar("khqr_md5", { length: 64 }),
    paymentExpiresAt: timestamp("payment_expires_at", { withTimezone: true }),
    /** Bakong transaction hash / external reference once paid. */
    paymentRef: varchar("payment_ref", { length: 128 }),
    /** Raw payment confirmation payload (for audits). */
    paymentPayload: jsonb("payment_payload"),
    lastPaymentCheckAt: timestamp("last_payment_check_at", { withTimezone: true }),
    /**
     * Set when a payment check at/after paymentExpiresAt returned a definitive
     * answer (paid or unpaid). Null on an expired/cancelled order means the final
     * check never succeeded (e.g. Bakong token outage), so reconcile keeps
     * re-checking it beyond the normal late-payment window.
     */
    paymentFinalCheckedAt: timestamp("payment_final_checked_at", { withTimezone: true }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),

    // ── Customer contact ──
    contactPhone: varchar("contact_phone", { length: 32 }),
    contactTelegram: varchar("contact_telegram", { length: 64 }),
    /** Set when the customer opens t.me/<bot>?start=ord_<code>; used for status pushes. */
    customerTelegramChatId: varchar("customer_telegram_chat_id", { length: 32 }),
    customerNote: text("customer_note"),
    adminNote: text("admin_note"),
    locale: varchar("locale", { length: 5 }).notNull().default("en"),

    // ── Marketing attribution (see src/lib/attribution.ts) ──
    /** facebook | tiktok | telegram | google | direct | other */
    channel: varchar("channel", { length: 24 }).notNull().default("direct"),
    utmSource: varchar("utm_source", { length: 120 }),
    utmMedium: varchar("utm_medium", { length: 120 }),
    utmCampaign: varchar("utm_campaign", { length: 120 }),
    utmContent: varchar("utm_content", { length: 120 }),
    utmTerm: varchar("utm_term", { length: 120 }),
    /** fbclid or ttclid from ad clicks. */
    clickId: varchar("click_id", { length: 255 }),
    referrer: text("referrer"),
    landingPath: text("landing_path"),

    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  (t) => [
    index("orders_status_idx").on(t.status),
    index("orders_created_idx").on(t.createdAt),
    index("orders_md5_idx").on(t.khqrMd5),
    index("orders_channel_idx").on(t.channel),
    // Telegram `/status` (no code) lists the orders linked to the chat.
    index("orders_tg_chat_idx").on(t.customerTelegramChatId),
    // Promo-use reservations count pending orders per code.
    index("orders_promo_status_idx").on(t.promoCodeId, t.status),
  ],
);

/** Audit timeline for an order. */
export const orderEvents = pgTable(
  "order_events",
  {
    id: serial("id").primaryKey(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    /** created | paid | processing | delivered | failed | refunded | expired | cancelled | note | notify */
    type: varchar("type", { length: 32 }).notNull(),
    message: text("message"),
    /** system | admin | telegram | customer */
    actor: varchar("actor", { length: 32 }).notNull().default("system"),
    data: jsonb("data"),
    createdAt: createdAt(),
  },
  (t) => [index("order_events_order_idx").on(t.orderId, t.createdAt)],
);

/** Key/value store settings editable from the admin panel (see src/lib/settings.ts). */
export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export type Game = typeof games.$inferSelect;
export type NewGame = typeof games.$inferInsert;
export type Package = typeof packages.$inferSelect;
export type NewPackage = typeof packages.$inferInsert;
export type PromoCode = typeof promoCodes.$inferSelect;
export type NewPromoCode = typeof promoCodes.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type NewOrder = typeof orders.$inferInsert;
export type OrderEvent = typeof orderEvents.$inferSelect;
