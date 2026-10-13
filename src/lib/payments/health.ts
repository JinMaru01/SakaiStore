import "server-only";
import { notifyPaymentHealth } from "@/lib/notify";
import { getInternalSettings, updateInternalSettings, type BakongHealthState } from "@/lib/settings";
import type { BakongHealthAlert } from "@/lib/telegram/format";
import { isProviderFailure, type PaymentCheckResult } from "./index";

/**
 * Bakong payment-check health. Every Bakong answer (paid/unpaid) or Bakong
 * failure (token rejected, timeout, HTTP 5xx…) is recorded in the "health"
 * settings section, so the admin panel can show when checks last worked and
 * admins get a Telegram alert while they fail:
 *
 *  - token/config errors (they never fix themselves) alert right away;
 *    transient errors alert once checks have failed for BAKONG_ALERT_AFTER_MS
 *    with no success in between;
 *  - at most one alert per BAKONG_ALERT_INTERVAL_MS while it lasts, plus one
 *    "recovered" message on the first successful check afterwards.
 *
 * The rate limit lives in the database (a row lock decides who sends), not in
 * memory, because serverless instances share no memory. Errors about a single
 * order (amount mismatch, missing md5) say nothing about Bakong and are ignored.
 * Nothing here ever throws.
 */

export type BakongHealthStatus = "ok" | "failing" | "unknown";

export type BakongHealth = {
  lastOkAt: string | null;
  lastErrorAt: string | null;
  lastErrorMessage: string | null;
  lastAlertAt: string | null;
  /** ok: the latest check worked; failing: the latest check failed; unknown: no check recorded yet. */
  status: BakongHealthStatus;
};

/** At most one "failing" alert per hour while checks keep failing. */
export const BAKONG_ALERT_INTERVAL_MS = 60 * 60_000;
/** Transient errors alert only after checks have failed this long without a success. */
export const BAKONG_ALERT_AFTER_MS = 3 * 60_000;
/** A failure this long after the previous one starts a new run, so isolated blips never add up to an alert. */
export const BAKONG_FAILURE_RUN_GAP_MS = 15 * 60_000;
/** Each instance writes the same outcome at most this often (customer polling checks every few seconds). */
export const BAKONG_HEALTH_WRITE_THROTTLE_MS = 30_000;

/** Errors that will not fix themselves: alert immediately. */
const URGENT_CODES = new Set(["auth", "not_configured"]);

export type BakongCheckOutcome = { ok: true } | { ok: false; message: string; code: string };

const parse = (iso: string | null): Date | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
};

/**
 * Pure state transition for one recorded check: the new state, and the
 * Telegram alert to send (if any). Exported for unit tests.
 */
export function applyBakongCheck(
  state: BakongHealthState,
  outcome: BakongCheckOutcome,
  now: Date,
): { next: BakongHealthState; alert: BakongHealthAlert | null } {
  if (outcome.ok) {
    return {
      next: { ...state, lastOkAt: now.toISOString(), failingSince: null, alertOpen: false },
      alert: state.alertOpen ? { kind: "recovered", since: parse(state.failingSince), at: now } : null,
    };
  }

  const lastError = parse(state.lastErrorAt);
  let since = parse(state.failingSince);
  if (!since || !lastError || now.getTime() - lastError.getTime() > BAKONG_FAILURE_RUN_GAP_MS) since = now;
  const urgent = URGENT_CODES.has(outcome.code);
  const sustained = urgent || now.getTime() - since.getTime() >= BAKONG_ALERT_AFTER_MS;
  const lastAlert = parse(state.lastAlertAt);
  const slotFree = !lastAlert || now.getTime() - lastAlert.getTime() >= BAKONG_ALERT_INTERVAL_MS;
  const alert: BakongHealthAlert | null =
    sustained && slotFree ? { kind: "failing", message: outcome.message, code: outcome.code, since } : null;

  return {
    next: {
      ...state,
      lastErrorAt: now.toISOString(),
      lastErrorMessage: outcome.message.slice(0, 500),
      failingSince: since.toISOString(),
      lastAlertAt: alert ? now.toISOString() : state.lastAlertAt,
      alertOpen: state.alertOpen || alert !== null,
    },
    alert,
  };
}

export function bakongHealthStatus(state: Pick<BakongHealthState, "lastOkAt" | "lastErrorAt">): BakongHealthStatus {
  const ok = parse(state.lastOkAt);
  const error = parse(state.lastErrorAt);
  if (!ok && !error) return "unknown";
  if (error && (!ok || error.getTime() > ok.getTime())) return "failing";
  return "ok";
}

/** Current Bakong check health for the admin panel (fresh read; "unknown" until a check ran in bakong mode). */
export async function getBakongHealth(): Promise<BakongHealth> {
  const { bakong } = await getInternalSettings("health");
  return {
    lastOkAt: bakong.lastOkAt,
    lastErrorAt: bakong.lastErrorAt,
    lastErrorMessage: bakong.lastErrorMessage,
    lastAlertAt: bakong.lastAlertAt,
    status: bakongHealthStatus(bakong),
  };
}

let lastWrite: { ok: boolean; at: number } | null = null;

/** Tests: forget this instance's write throttle. */
export function resetBakongHealthThrottle(): void {
  lastWrite = null;
}

/**
 * Record the outcome of one Bakong payment check (call it in bakong mode
 * only) and send the failing/recovered alert it calls for. Never throws.
 */
export async function recordBakongCheck(result: PaymentCheckResult, now: Date = new Date()): Promise<void> {
  try {
    if (result.status === "error" && !isProviderFailure(result)) return;
    const outcome: BakongCheckOutcome =
      result.status === "error" ? { ok: false, message: result.message, code: result.code } : { ok: true };

    // Same outcome recorded by this instance moments ago: nothing new to say.
    if (lastWrite && lastWrite.ok === outcome.ok && now.getTime() - lastWrite.at < BAKONG_HEALTH_WRITE_THROTTLE_MS) {
      return;
    }
    lastWrite = { ok: outcome.ok, at: now.getTime() };

    const { before } = await updateInternalSettings("health", (health) => ({
      ...health,
      bakong: applyBakongCheck(health.bakong, outcome, now).next,
    }));
    // applyBakongCheck is pure: the alert that goes with the state we just wrote.
    const { alert } = applyBakongCheck(before.bakong, outcome, now);
    if (alert) await notifyPaymentHealth(alert);
  } catch (err) {
    console.error("[payments] could not record Bakong check health", err);
  }
}
