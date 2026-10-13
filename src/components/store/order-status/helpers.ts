import type { OrderStatus } from "@/lib/orders/status";

/**
 * Pure helpers for the live order page (polling cadence, countdown, QR path,
 * purchase-pixel rules). Safe for server and client.
 */

/** Statuses that change on their own soon (payment / delivery in progress): poll fast. */
export const ACTIVE_STATUSES: readonly OrderStatus[] = ["pending_payment", "paid", "processing"];

export const POLL_INTERVAL_MS = 4_000;
/** A failed order may be retried or delivered by an admin; check occasionally. */
export const SLOW_POLL_INTERVAL_MS = 20_000;

/** Milliseconds until the next poll, or null to stop polling. */
export function pollIntervalFor(status: OrderStatus): number | null {
  if (ACTIVE_STATUSES.includes(status)) return POLL_INTERVAL_MS;
  if (status === "failed") return SLOW_POLL_INTERVAL_MS;
  return null;
}

/** Statuses that mean "money received and the order is going well" — fire the Purchase pixel. */
export const PURCHASE_STATUSES: readonly OrderStatus[] = ["paid", "processing", "delivered"];

export function isPurchaseStatus(status: OrderStatus): boolean {
  return PURCHASE_STATUSES.includes(status);
}

/** "mm:ss" (or "h:mm:ss") for a remaining duration; never negative. */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** Remaining ms until an ISO timestamp (null when unknown). */
export function remainingMs(iso: string | null | undefined, now: number): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? null : t - now;
}

/**
 * SVG path for QR modules: one subpath per horizontal run of dark modules
 * (far fewer nodes than one rect per module). `get(row, col)` returns 1 for dark.
 */
export function qrPath(size: number, get: (row: number, col: number) => number | boolean): string {
  let d = "";
  for (let y = 0; y < size; y++) {
    let x = 0;
    while (x < size) {
      if (!get(y, x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < size && get(y, x)) x++;
      d += `M${start} ${y}h${x - start}v1h-${x - start}z`;
    }
  }
  return d;
}

const CAMBODIA_OFFSET_MS = 7 * 60 * 60 * 1000; // Asia/Phnom_Penh is UTC+7 all year (no DST)

/**
 * "13/10/2026 14:05" in Cambodia time. Deterministic (no Intl locale data),
 * so server-rendered and hydrated markup always match.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const d = new Date(t + CAMBODIA_OFFSET_MS);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getUTCDate())}/${p(d.getUTCMonth() + 1)}/${d.getUTCFullYear()} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`;
}
