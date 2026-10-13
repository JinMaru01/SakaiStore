/**
 * Store-local time helpers. The shop runs on Phnom Penh time (Asia/Phnom_Penh,
 * UTC+7). Cambodia has no daylight saving, so a fixed offset is exact and
 * keeps day math (today, last 7 days, daily buckets) cheap and testable.
 * Pure; safe for server and client.
 */

export const STORE_TIME_ZONE = "Asia/Phnom_Penh";
export const STORE_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
export const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/** The UTC instant at which the Phnom Penh calendar day containing `date` starts. */
export function startOfStoreDay(date: Date): Date {
  const local = date.getTime() + STORE_UTC_OFFSET_MS;
  return new Date(Math.floor(local / DAY_MS) * DAY_MS - STORE_UTC_OFFSET_MS);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

/** "YYYY-MM-DD" of the Phnom Penh day containing `date`. */
export function storeDateKey(date: Date): string {
  return new Date(date.getTime() + STORE_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** Validates the calendar date (rejects 2026-02-30) and returns the UTC ms of its midnight. */
function utcMidnight(y: number, m: number, d: number): number | null {
  const ms = Date.UTC(y, m - 1, d);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== y || check.getUTCMonth() !== m - 1 || check.getUTCDate() !== d) return null;
  return ms;
}

/** Parse "YYYY-MM-DD" (e.g. from <input type="date">) as the start of that Phnom Penh day. */
export function parseStoreDate(value: string | null | undefined): Date | null {
  const m = typeof value === "string" ? DATE_RE.exec(value.trim()) : null;
  if (!m) return null;
  const ms = utcMidnight(Number(m[1]), Number(m[2]), Number(m[3]));
  return ms == null ? null : new Date(ms - STORE_UTC_OFFSET_MS);
}

/** Parse a datetime-local value ("YYYY-MM-DDTHH:mm") entered in Phnom Penh time. */
export function parseStoreDateTime(value: string | null | undefined): Date | null {
  const m = typeof value === "string" ? DATETIME_RE.exec(value.trim()) : null;
  if (!m) return null;
  const day = utcMidnight(Number(m[1]), Number(m[2]), Number(m[3]));
  const [h, min, s] = [Number(m[4]), Number(m[5]), Number(m[6] ?? 0)];
  if (day == null || h > 23 || min > 59 || s > 59) return null;
  return new Date(day + ((h * 60 + min) * 60 + s) * 1000 - STORE_UTC_OFFSET_MS);
}

/** Date → "YYYY-MM-DDTHH:mm" in Phnom Penh time, for datetime-local inputs. */
export function toStoreDateTimeInput(date: Date | null | undefined): string {
  if (!date) return "";
  return new Date(date.getTime() + STORE_UTC_OFFSET_MS).toISOString().slice(0, 16);
}

/** The last `n` Phnom Penh days ending with today, oldest first. */
export function lastStoreDays(n: number, now: Date = new Date()): { key: string; start: Date }[] {
  const today = startOfStoreDay(now);
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(today, i - (n - 1));
    return { key: storeDateKey(start), start };
  });
}

/** [from, to) window covering the last `days` Phnom Penh days including today. */
export function lastDaysWindow(days: number, now: Date = new Date()): { from: Date; to: Date } {
  const today = startOfStoreDay(now);
  return { from: addDays(today, -(days - 1)), to: addDays(today, 1) };
}
