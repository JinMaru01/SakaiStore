import { z } from "zod";
import type { Game, Package } from "@/db/schema";
import { compileSafePattern } from "@/lib/orders/validation";
import { parseUsdToCents } from "@/lib/utils";
import { centsToInput } from "./format";

/**
 * Game + packages editor: form value shapes (what the client edits, all
 * strings/booleans) and the zod schemas that turn them into DB values.
 * Pure; the client imports the value types and helpers, the server action
 * does the authoritative parse.
 */

export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const PACKAGE_BADGES = ["hot", "best", "new", "promo"] as const;
export const MAX_PACKAGES = 100;
const MAX_PRICE_CENTS = 1_000_000; // $10,000 — anything above is a typo
const MAX_ZONE_OPTIONS = 50;

export type GameFormValues = {
  name: string;
  slug: string;
  publisher: string;
  tagline: string;
  description: string;
  currencyName: string;
  imageUrl: string;
  accentColor: string;
  idLabel: string;
  idPattern: string;
  idHelp: string;
  requiresZone: boolean;
  zoneLabel: string;
  zonePattern: string;
  /** One "value|label" per line. */
  zoneOptions: string;
  hashtags: string;
  featured: boolean;
  active: boolean;
  sortOrder: string;
};

export type PackageFormValues = {
  /** Stable client key for React lists (existing: "p<id>", new: random). */
  key: string;
  id: number | null;
  name: string;
  amount: string;
  bonus: string;
  /** Dollars, e.g. "1.45". */
  price: string;
  compareAt: string;
  badge: string;
  supplierSku: string;
  active: boolean;
};

export type GameEditorValues = { game: GameFormValues; packages: PackageFormValues[] };

export const EMPTY_GAME: GameFormValues = {
  name: "",
  slug: "",
  publisher: "",
  tagline: "",
  description: "",
  currencyName: "Diamonds",
  imageUrl: "",
  accentColor: "#7c5cff",
  idLabel: "User ID",
  idPattern: "",
  idHelp: "",
  requiresZone: false,
  zoneLabel: "",
  zonePattern: "",
  zoneOptions: "",
  hashtags: "",
  featured: false,
  active: true,
  sortOrder: "0",
};

// ───────────────────────────── zone options ─────────────────────────────

export type ZoneOption = { value: string; label: string };

export function formatZoneOptions(options: ZoneOption[] | null | undefined): string {
  return (options ?? []).map((o) => (o.label && o.label !== o.value ? `${o.value}|${o.label}` : o.value)).join("\n");
}

/** Parse "value|label" lines (label optional). Returns the 1-based line of the first problem. */
export function parseZoneOptions(
  text: string,
): { ok: true; options: ZoneOption[] } | { ok: false; error: string } {
  const options: ZoneOption[] = [];
  const seen = new Set<string>();
  const lines = text.split(/\r?\n/);
  for (const [i, line] of lines.entries()) {
    if (!line.trim()) continue;
    const bar = line.indexOf("|");
    const value = (bar === -1 ? line : line.slice(0, bar)).trim();
    const label = (bar === -1 ? "" : line.slice(bar + 1)).trim() || value;
    if (!value) return { ok: false, error: `Line ${i + 1}: missing value before "|"` };
    if (value.length > 32) return { ok: false, error: `Line ${i + 1}: value is longer than 32 characters` };
    if (/\s/.test(value)) return { ok: false, error: `Line ${i + 1}: value cannot contain spaces` };
    if (label.length > 60) return { ok: false, error: `Line ${i + 1}: label is longer than 60 characters` };
    const k = value.toLowerCase();
    if (seen.has(k)) return { ok: false, error: `Line ${i + 1}: duplicate value "${value}"` };
    seen.add(k);
    options.push({ value, label });
  }
  if (options.length > MAX_ZONE_OPTIONS) return { ok: false, error: `At most ${MAX_ZONE_OPTIONS} options` };
  return { ok: true, options };
}

/** "MLBB, #MobileLegends  mlbb" → "#MLBB #MobileLegends" (deduplicated, case-insensitive). */
export function normalizeHashtags(input: string): string {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(/[\s,]+/)) {
    const tag = raw.replace(/^#+/, "").replace(/[^\p{L}\p{N}_]/gu, "");
    if (!tag || seen.has(tag.toLowerCase())) continue;
    seen.add(tag.toLowerCase());
    out.push(`#${tag}`);
  }
  return out.join(" ");
}

/** Bulk price change: apply ±percent and round to the nearest 5 cents (never below 5¢). */
export function adjustPriceCents(cents: number, percent: number): number {
  const next = Math.round((cents * (1 + percent / 100)) / 5) * 5;
  return Math.max(5, next);
}

// ───────────────────────────── schemas ─────────────────────────────

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `At most ${max} characters`)
    .transform((v) => v || null);

const pattern = z
  .string()
  .trim()
  .max(160, "At most 160 characters")
  .refine((v) => v === "" || compileSafePattern(v) !== null, "Not a valid (or safe) regular expression")
  .transform((v) => v || null);

/** next/image can render https URLs and local /paths (see game-art.ts). */
function isAllowedImageUrl(v: string): boolean {
  if (v.startsWith("/") && !v.startsWith("//")) return true;
  try {
    return new URL(v).protocol === "https:";
  } catch {
    return false;
  }
}

export const gameFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120, "At most 120 characters"),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Slug is required")
      .max(64, "At most 64 characters")
      .regex(SLUG_RE, "Use lowercase letters, numbers and single dashes (e.g. free-fire)"),
    publisher: optionalText(120),
    tagline: optionalText(200),
    description: optionalText(2000),
    currencyName: z.string().trim().min(1, "Currency name is required").max(40, "At most 40 characters"),
    imageUrl: z
      .string()
      .trim()
      .max(500, "At most 500 characters")
      .refine((v) => v === "" || isAllowedImageUrl(v), "Use an https:// URL or a /path on this site")
      .transform((v) => v || null),
    accentColor: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, "Use a #rrggbb color")
      .transform((v) => v.toLowerCase()),
    idLabel: z.string().trim().min(1, "ID label is required").max(40, "At most 40 characters"),
    idPattern: pattern,
    idHelp: optionalText(500),
    requiresZone: z.boolean(),
    zoneLabel: optionalText(40),
    zonePattern: pattern,
    zoneOptions: z.string().max(4000, "Too many zone options"),
    hashtags: z
      .string()
      .max(300, "At most 300 characters")
      .transform((v) => normalizeHashtags(v) || null),
    featured: z.boolean(),
    active: z.boolean(),
    sortOrder: z.coerce
      .number({ error: "Enter a whole number" })
      .int("Enter a whole number")
      .min(-10_000)
      .max(10_000),
  })
  .transform((v, ctx) => {
    const zones = parseZoneOptions(v.zoneOptions);
    if (!zones.ok) {
      ctx.addIssue({ code: "custom", message: zones.error, path: ["zoneOptions"] });
      return z.NEVER;
    }
    const usesZone = v.requiresZone || zones.options.length > 0;
    if (usesZone && !v.zoneLabel) {
      ctx.addIssue({ code: "custom", message: "Required when the game uses a zone/server", path: ["zoneLabel"] });
      return z.NEVER;
    }
    return { ...v, zoneOptions: zones.options.length ? zones.options : null };
  });

export type GameData = z.output<typeof gameFormSchema>;

const wholeNumber = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      const n = Number(v || "0");
      if (!Number.isInteger(n) || n < 0 || n > 100_000_000) {
        ctx.addIssue({ code: "custom", message: `${label} must be a whole number (0 or more)` });
        return z.NEVER;
      }
      return n;
    });

export const packageFormSchema = z
  .object({
    id: z.number().int().positive().nullable(),
    name: z.string().trim().min(1, "Name is required").max(120, "At most 120 characters"),
    amount: wholeNumber("Amount"),
    bonus: wholeNumber("Bonus"),
    price: z.string(),
    compareAt: z.string(),
    badge: z
      .string()
      .trim()
      .toLowerCase()
      .max(24, "At most 24 characters")
      .regex(/^[a-z0-9-]*$/, "Letters, numbers and dashes only")
      .transform((v) => v || null),
    supplierSku: optionalText(64),
    active: z.boolean(),
  })
  .transform((v, ctx) => {
    const priceCents = parseUsdToCents(v.price);
    if (priceCents == null || priceCents < 1 || priceCents > MAX_PRICE_CENTS) {
      ctx.addIssue({ code: "custom", message: "Enter a price like 1.45", path: ["price"] });
      return z.NEVER;
    }
    let compareAtCents: number | null = null;
    if (v.compareAt.trim()) {
      compareAtCents = parseUsdToCents(v.compareAt);
      if (compareAtCents == null || compareAtCents > MAX_PRICE_CENTS) {
        ctx.addIssue({ code: "custom", message: "Enter a price like 1.95", path: ["compareAt"] });
        return z.NEVER;
      }
      if (compareAtCents <= priceCents) {
        ctx.addIssue({ code: "custom", message: "Must be higher than the price", path: ["compareAt"] });
        return z.NEVER;
      }
    }
    return {
      id: v.id,
      name: v.name,
      amount: v.amount,
      bonus: v.bonus,
      priceCents,
      compareAtCents,
      badge: v.badge,
      supplierSku: v.supplierSku,
      active: v.active,
    };
  });

export type PackageData = z.output<typeof packageFormSchema>;

export const packagesFormSchema = z
  .array(packageFormSchema)
  .max(MAX_PACKAGES, `At most ${MAX_PACKAGES} packages per game`)
  .superRefine((list, ctx) => {
    const ids = new Set<number>();
    for (const [i, p] of list.entries()) {
      if (p.id == null) continue;
      if (ids.has(p.id)) ctx.addIssue({ code: "custom", message: "Duplicate package", path: [i, "name"] });
      ids.add(p.id);
    }
  });

// ───────────────────────────── DB → form values ─────────────────────────────

export function gameToFormValues(game: Game): GameFormValues {
  return {
    name: game.name,
    slug: game.slug,
    publisher: game.publisher ?? "",
    tagline: game.tagline ?? "",
    description: game.description ?? "",
    currencyName: game.currencyName,
    imageUrl: game.imageUrl ?? "",
    accentColor: /^#[0-9a-f]{6}$/i.test(game.accentColor) ? game.accentColor.toLowerCase() : "#7c5cff",
    idLabel: game.idLabel,
    idPattern: game.idPattern ?? "",
    idHelp: game.idHelp ?? "",
    requiresZone: game.requiresZone,
    zoneLabel: game.zoneLabel ?? "",
    zonePattern: game.zonePattern ?? "",
    zoneOptions: formatZoneOptions(game.zoneOptions),
    hashtags: game.hashtags ?? "",
    featured: game.featured,
    active: game.active,
    sortOrder: String(game.sortOrder),
  };
}

export function packageToFormValues(pkg: Package): PackageFormValues {
  return {
    key: `p${pkg.id}`,
    id: pkg.id,
    name: pkg.name,
    amount: String(pkg.amount),
    bonus: String(pkg.bonus),
    price: centsToInput(pkg.priceCents),
    compareAt: centsToInput(pkg.compareAtCents),
    badge: pkg.badge ?? "",
    supplierSku: pkg.supplierSku ?? "",
    active: pkg.active,
  };
}
