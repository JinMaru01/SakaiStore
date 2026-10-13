import { STORE_TIME_ZONE } from "./time";

/**
 * Display formatting for the admin panel (English only, Phnom Penh time).
 * Pure; dates are formatted on the server and passed to client components as
 * strings so server and browser never disagree (hydration-safe).
 */

const dateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: STORE_TIME_ZONE,
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const shortDateTimeFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: STORE_TIME_ZONE,
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

const dayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", day: "numeric", month: "short" });
const weekdayFmt = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", weekday: "short" });

/** "13 Oct 2026, 14:05" (Phnom Penh). */
export function formatDateTime(date: Date | null | undefined): string {
  return date ? dateTimeFmt.format(date) : "—";
}

/** "13 Oct, 14:05" (Phnom Penh) — for dense tables. */
export function formatShortDateTime(date: Date | null | undefined): string {
  return date ? shortDateTimeFmt.format(date) : "—";
}

/** "2026-10-13" day key → "13 Oct". */
export function formatDayKey(key: string): string {
  return dayFmt.format(new Date(`${key}T00:00:00Z`));
}

/** "2026-10-13" day key → "Tue". */
export function formatWeekday(key: string): string {
  return weekdayFmt.format(new Date(`${key}T00:00:00Z`));
}

/** Compact age: "just now", "5m", "3h 10m", "2d". */
export function formatAge(date: Date | null | undefined, now: Date = new Date()): string {
  if (!date) return "—";
  const mins = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60_000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return mins % 60 ? `${hours}h ${mins % 60}m` : `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

/** 0.4256 → "42.6%"; null/NaN → "—". */
export function formatPercent(ratio: number | null | undefined, digits = 1): string {
  if (ratio == null || !Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(digits).replace(/\.0+$/, "")}%`;
}

/** Cents → "1.50" for price inputs (no currency sign). */
export function centsToInput(cents: number | null | undefined): string {
  if (cents == null) return "";
  return (cents / 100).toFixed(2);
}

/** Axis/compact money: 0 → "$0", 1250 → "$12.50", 125000 → "$1,250", 1250000 → "$12.5K". */
export function formatUsdCompact(cents: number): string {
  const dollars = cents / 100;
  if (Math.abs(dollars) >= 10_000) return `$${(dollars / 1000).toFixed(dollars % 1000 === 0 ? 0 : 1).replace(/\.0$/, "")}K`;
  if (Number.isInteger(dollars)) return `$${dollars.toLocaleString("en-US")}`;
  return `$${dollars.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** A "nice" axis maximum ≥ value (1, 2, 2.5, 5 × 10ⁿ). */
export function niceCeiling(value: number): number {
  if (!(value > 0)) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (step * magnitude >= value) return step * magnitude;
  }
  return 10 * magnitude;
}

/** "just now" / "15m ago" / "2h 30m ago". */
export function formatAgo(date: Date | null | undefined, now: Date = new Date()): string {
  const age = formatAge(date, now);
  return age === "just now" || age === "—" ? age : `${age} ago`;
}
