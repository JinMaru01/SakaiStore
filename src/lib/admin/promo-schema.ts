import { z } from "zod";
import type { PromoCode } from "@/db/schema";
import { formatUsd, parseUsdToCents } from "@/lib/utils";
import { centsToInput } from "./format";
import { parseStoreDateTime, toStoreDateTimeInput } from "./time";

/**
 * Promo code form: values (strings, as typed) → validated DB values.
 * Pure; shared by the promo form (client) and the server actions.
 */

export const PROMO_CODE_RE = /^[A-Z0-9_-]{3,32}$/;
/** Channels a code can be promoted on (orders.channel adds google/direct, which have no codes). */
export const PROMO_CHANNELS = ["facebook", "tiktok", "telegram", "other"] as const;
export type PromoChannel = (typeof PROMO_CHANNELS)[number];

export type PromoFormValues = {
  code: string;
  description: string;
  type: "percent" | "fixed";
  /** percent: "10"; fixed: dollars "1.00". */
  value: string;
  maxDiscount: string;
  minOrder: string;
  maxUses: string;
  gameId: string;
  channel: string;
  /** datetime-local in Phnom Penh time. */
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export const EMPTY_PROMO: PromoFormValues = {
  code: "",
  description: "",
  type: "percent",
  value: "",
  maxDiscount: "",
  minOrder: "",
  maxUses: "",
  gameId: "",
  channel: "",
  startsAt: "",
  endsAt: "",
  active: true,
};

const MAX_CENTS = 1_000_000;

const dollarsOrEmpty = (label: string) =>
  z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const cents = parseUsdToCents(v);
      if (cents == null || cents > MAX_CENTS) {
        ctx.addIssue({ code: "custom", message: `${label}: enter an amount like 2.50` });
        return z.NEVER;
      }
      return cents;
    });

const dateTimeOrEmpty = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (!v) return null;
    const d = parseStoreDateTime(v);
    if (!d) {
      ctx.addIssue({ code: "custom", message: "Enter a valid date and time" });
      return z.NEVER;
    }
    return d;
  });

export const promoFormSchema = z
  .object({
    code: z
      .string()
      .transform((v) => v.replace(/\s+/g, "").toUpperCase())
      .pipe(z.string().regex(PROMO_CODE_RE, "3–32 characters: A–Z, 0–9, _ or -")),
    description: z
      .string()
      .trim()
      .max(300, "At most 300 characters")
      .transform((v) => v || null),
    type: z.enum(["percent", "fixed"], { error: "Choose a discount type" }),
    value: z.string().trim(),
    maxDiscount: dollarsOrEmpty("Max discount"),
    minOrder: dollarsOrEmpty("Minimum order"),
    maxUses: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (!v) return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 1_000_000) {
          ctx.addIssue({ code: "custom", message: "Enter a whole number (1 or more), or leave empty for unlimited" });
          return z.NEVER;
        }
        return n;
      }),
    gameId: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (!v) return null;
        const n = Number(v);
        if (!Number.isInteger(n) || n < 1 || n > 2_147_483_647) {
          ctx.addIssue({ code: "custom", message: "Choose a game" });
          return z.NEVER;
        }
        return n;
      }),
    channel: z
      .string()
      .trim()
      .transform((v, ctx) => {
        if (!v) return null;
        if (!(PROMO_CHANNELS as readonly string[]).includes(v)) {
          ctx.addIssue({ code: "custom", message: "Choose a channel" });
          return z.NEVER;
        }
        return v as PromoChannel;
      }),
    startsAt: dateTimeOrEmpty,
    endsAt: dateTimeOrEmpty,
    active: z.boolean(),
  })
  .transform((v, ctx) => {
    let value: number;
    if (v.type === "percent") {
      const n = Number(v.value.replace(/%$/, "").trim());
      if (!v.value || !Number.isInteger(n) || n < 1 || n > 100) {
        ctx.addIssue({ code: "custom", message: "Enter a whole percentage from 1 to 100", path: ["value"] });
        return z.NEVER;
      }
      value = n;
    } else {
      const cents = parseUsdToCents(v.value);
      if (cents == null || cents < 1 || cents > MAX_CENTS) {
        ctx.addIssue({ code: "custom", message: "Enter an amount like 1.00", path: ["value"] });
        return z.NEVER;
      }
      value = cents;
    }
    if (v.startsAt && v.endsAt && v.endsAt.getTime() <= v.startsAt.getTime()) {
      ctx.addIssue({ code: "custom", message: "Must be after the start", path: ["endsAt"] });
      return z.NEVER;
    }
    return {
      code: v.code,
      description: v.description,
      type: v.type,
      value,
      // A cap only makes sense for percentage codes.
      maxDiscountCents: v.type === "percent" ? v.maxDiscount : null,
      minOrderCents: v.minOrder ?? 0,
      maxUses: v.maxUses,
      gameId: v.gameId,
      channel: v.channel,
      startsAt: v.startsAt,
      endsAt: v.endsAt,
      active: v.active,
    };
  });

export type PromoData = z.output<typeof promoFormSchema>;

export function promoToFormValues(p: PromoCode): PromoFormValues {
  return {
    code: p.code,
    description: p.description ?? "",
    type: p.type,
    value: p.type === "percent" ? String(p.value) : centsToInput(p.value),
    maxDiscount: centsToInput(p.maxDiscountCents),
    minOrder: p.minOrderCents ? centsToInput(p.minOrderCents) : "",
    maxUses: p.maxUses != null ? String(p.maxUses) : "",
    gameId: p.gameId != null ? String(p.gameId) : "",
    channel: p.channel ?? "",
    startsAt: toStoreDateTimeInput(p.startsAt),
    endsAt: toStoreDateTimeInput(p.endsAt),
    active: p.active,
  };
}

export type PromoState = "active" | "scheduled" | "expired" | "used_up" | "inactive";

/** Where a code stands right now (same rules as evaluatePromo, minus per-order checks). */
export function promoState(
  p: Pick<PromoCode, "active" | "startsAt" | "endsAt" | "maxUses" | "usedCount">,
  now: Date = new Date(),
): PromoState {
  if (!p.active) return "inactive";
  if (p.endsAt && p.endsAt.getTime() <= now.getTime()) return "expired";
  if (p.maxUses != null && p.usedCount >= p.maxUses) return "used_up";
  if (p.startsAt && p.startsAt.getTime() > now.getTime()) return "scheduled";
  return "active";
}

/** "10% off (max $2.00)" / "$1.00 off". */
export function describeDiscount(p: Pick<PromoCode, "type" | "value" | "maxDiscountCents">): string {
  if (p.type === "percent") {
    return p.maxDiscountCents != null ? `${p.value}% off (max ${formatUsd(p.maxDiscountCents)})` : `${p.value}% off`;
  }
  return `${formatUsd(p.value)} off`;
}
