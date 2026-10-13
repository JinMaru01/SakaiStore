import "server-only";
import { cache } from "react";
import { eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { settings as settingsTable } from "@/db/schema";

/**
 * Store settings editable from /admin/settings. Each top-level key is one row
 * in the `settings` table; missing rows/fields fall back to DEFAULTS, so the
 * site works on an empty database.
 */

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Must start with http:// or https://")
  .default("");

const localized = z.object({ en: z.string().max(500).default(""), km: z.string().max(500).default("") });

export const storeSettingsSchema = z.object({
  name: z.string().trim().min(1).max(60).default("Sakai Store"),
  tagline: localized.default({
    en: "Fast, fairly priced game top-up in Cambodia",
    km: "បញ្ចូលហ្គេមរហ័ស តម្លៃសមរម្យ នៅកម្ពុជា",
  }),
  /** Site-wide announcement bar; empty = hidden. */
  announcement: localized.default({ en: "", km: "" }),
  supportPhone: z.string().trim().max(32).default(""),
  /** Telegram username for support, without @. */
  supportTelegram: z.string().trim().max(64).default(""),
  /** Display-only exchange rate for showing KHR next to USD prices. */
  khrPerUsd: z.coerce.number().int().min(1000).max(10000).default(4100),
});

export const socialSettingsSchema = z.object({
  facebookUrl: optionalUrl,
  tiktokUrl: optionalUrl,
  telegramUrl: optionalUrl,
  /** m.me/<page> link for Messenger chat. */
  messengerUrl: optionalUrl,
  youtubeUrl: optionalUrl,
  instagramUrl: optionalUrl,
});

export const marketingSettingsSchema = z.object({
  /** Promo code advertised to people who follow the Facebook page / TikTok. */
  followPromoCode: z.string().trim().max(32).default(""),
  /** Always appended to generated captions. */
  defaultHashtags: z
    .string()
    .trim()
    .max(300)
    .default("#SakaiStore #GameTopUp #Cambodia #TopUpKH"),
});

export const settingsSchema = z.object({
  store: storeSettingsSchema.default(storeSettingsSchema.parse({})),
  social: socialSettingsSchema.default(socialSettingsSchema.parse({})),
  marketing: marketingSettingsSchema.default(marketingSettingsSchema.parse({})),
});

export type StoreSettings = z.infer<typeof storeSettingsSchema>;
export type SocialSettings = z.infer<typeof socialSettingsSchema>;
export type MarketingSettings = z.infer<typeof marketingSettingsSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsKey = keyof Settings;

const SECTION_SCHEMAS = {
  store: storeSettingsSchema,
  social: socialSettingsSchema,
  marketing: marketingSettingsSchema,
} as const;

export const DEFAULT_SETTINGS: Settings = settingsSchema.parse({});

/**
 * Read all settings (merged over defaults). Invalid stored values fall back to
 * defaults. Deduplicated per request via React cache().
 */
export const getSettings = cache(async function getSettings(): Promise<Settings> {
  let rows: { key: string; value: unknown }[] = [];
  try {
    rows = await db
      .select({ key: settingsTable.key, value: settingsTable.value })
      .from(settingsTable)
      .where(inArray(settingsTable.key, Object.keys(SECTION_SCHEMAS)));
  } catch (err) {
    console.error("[settings] failed to load, using defaults", err);
    return DEFAULT_SETTINGS;
  }
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, unknown>;
  for (const row of rows) {
    const key = row.key as SettingsKey;
    const parsed = SECTION_SCHEMAS[key].safeParse(row.value);
    if (parsed.success) out[key] = parsed.data;
  }
  return out as Settings;
});

/** Validate and upsert one settings section. Throws ZodError on invalid input. */
export async function updateSettings<K extends SettingsKey>(
  key: K,
  value: z.input<(typeof SECTION_SCHEMAS)[K]>,
): Promise<Settings[K]> {
  const parsed = SECTION_SCHEMAS[key].parse(value) as Settings[K];
  await db
    .insert(settingsTable)
    .values({ key, value: parsed })
    .onConflictDoUpdate({
      target: settingsTable.key,
      set: { value: parsed, updatedAt: sql`now()` },
    });
  return parsed;
}

// ───────────────────────────── internal sections ─────────────────────────────

/**
 * System-maintained state, stored in the same table but NOT part of
 * `Settings`/getSettings() (never shown or edited in /admin/settings).
 * Serverless instances share no memory, so cross-instance state such as
 * alert rate limits lives here.
 */

const isoTime = z.string().max(40).nullable().default(null);

/** Bakong payment-check health (written by src/lib/payments/health.ts). */
export const bakongHealthStateSchema = z.object({
  /** Last check Bakong answered (paid or unpaid). ISO time. */
  lastOkAt: isoTime,
  /** Last check that failed because of Bakong (token, network, HTTP…). */
  lastErrorAt: isoTime,
  lastErrorMessage: z.string().max(500).nullable().default(null),
  /** Last "checks are failing" Telegram alert. */
  lastAlertAt: isoTime,
  /** First failure of the current run of failures (cleared by a successful check). */
  failingSince: isoTime,
  /** A failing alert went out and the "recovered" message is still owed. */
  alertOpen: z.boolean().default(false),
});

export const healthSettingsSchema = z.object({
  bakong: bakongHealthStateSchema.default(bakongHealthStateSchema.parse({})),
});

export type BakongHealthState = z.infer<typeof bakongHealthStateSchema>;
export type HealthSettings = z.infer<typeof healthSettingsSchema>;

const INTERNAL_SCHEMAS = { health: healthSettingsSchema } as const;
type InternalKey = keyof typeof INTERNAL_SCHEMAS;
type InternalValue<K extends InternalKey> = z.infer<(typeof INTERNAL_SCHEMAS)[K]>;

/** Read an internal section (fresh, never cached; defaults when missing, invalid or on DB errors). */
export async function getInternalSettings<K extends InternalKey>(key: K): Promise<InternalValue<K>> {
  const schema = INTERNAL_SCHEMAS[key];
  try {
    const [row] = await db
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .limit(1);
    const parsed = schema.safeParse(row?.value ?? {});
    if (parsed.success) return parsed.data as InternalValue<K>;
  } catch (err) {
    console.error(`[settings] failed to load ${key}, using defaults`, err);
  }
  return schema.parse({}) as InternalValue<K>;
}

/**
 * Atomically read-modify-write an internal section: the row is locked for
 * the duration, so concurrent writers (other requests, other instances) see
 * each other's changes and exactly one of them wins a "claim" such as an
 * alert slot. `mutate` gets a copy and returns the new value, or null to
 * leave the row untouched. Throws on DB errors.
 */
export async function updateInternalSettings<K extends InternalKey>(
  key: K,
  mutate: (current: InternalValue<K>) => InternalValue<K> | null,
): Promise<{ before: InternalValue<K>; after: InternalValue<K> }> {
  const schema = INTERNAL_SCHEMAS[key];
  return db.transaction(async (tx) => {
    await tx
      .insert(settingsTable)
      .values({ key, value: schema.parse({}) })
      .onConflictDoNothing({ target: settingsTable.key });
    const [row] = await tx
      .select({ value: settingsTable.value })
      .from(settingsTable)
      .where(eq(settingsTable.key, key))
      .for("update");
    const parsed = schema.safeParse(row?.value ?? {});
    const before = (parsed.success ? parsed.data : schema.parse({})) as InternalValue<K>;
    const next = mutate(structuredClone(before));
    if (next === null) return { before, after: before };
    const after = schema.parse(next) as InternalValue<K>;
    await tx.update(settingsTable).set({ value: after, updatedAt: sql`now()` }).where(eq(settingsTable.key, key));
    return { before, after };
  });
}
