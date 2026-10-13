import "server-only";
import { env } from "@/lib/env";

/**
 * Bakong Open API client: asks NBC whether a KHQR (identified by the md5 of
 * its string) has been paid. Docs: https://api-bakong.nbc.gov.kh/document
 *
 *   POST {BAKONG_API_BASE}/v1/check_transaction_by_md5   { "md5": "<hex>" }
 *   Authorization: Bearer <BAKONG_API_TOKEN>
 *   → { responseCode: 0, data: { hash, fromAccountId, toAccountId, currency, amount, ... } }  paid
 *   → { responseCode: 1, errorCode: 1, data: null }                                          not found (unpaid)
 *   → HTTP 401                                                                                 token expired
 *
 * Never throws: network/HTTP/format problems come back as { status: "error" }
 * so a Bakong outage can't break the order page.
 */

export const BAKONG_TIMEOUT_MS = 8_000;

/**
 * Why a check failed. Everything except `invalid_md5` means Bakong itself
 * could not answer (it says nothing about the order); `auth` and
 * `not_configured` will not fix themselves (renew/set BAKONG_API_TOKEN).
 */
export type BakongErrorCode =
  | "not_configured"
  | "auth"
  | "timeout"
  | "network"
  | "http"
  | "bad_response"
  | "api_error"
  | "invalid_md5";

export type BakongCheckResult =
  | {
      status: "paid";
      /** Bakong transaction hash (or external ref) — stored as orders.paymentRef. */
      ref: string | null;
      /** Amount in major units as returned by Bakong (USD dollars, e.g. 1.5). */
      amount: number;
      currency: string;
      toAccountId: string | null;
      raw: unknown;
    }
  | { status: "unpaid" }
  | { status: "error"; message: string; code: BakongErrorCode };

type BakongResponse = {
  responseCode?: number;
  responseMessage?: string | null;
  errorCode?: number | null;
  data?: Record<string, unknown> | null;
};

/** errorCode values that simply mean "no successful payment for this md5 (yet)". */
const UNPAID_ERROR_CODES = new Set([1, 3]);

const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export async function checkTransactionByMd5(
  md5: string,
  opts: { timeoutMs?: number } = {},
): Promise<BakongCheckResult> {
  const { BAKONG_API_BASE, BAKONG_API_TOKEN } = env();
  if (!BAKONG_API_TOKEN) return { status: "error", message: "BAKONG_API_TOKEN is not set", code: "not_configured" };
  if (!/^[a-f0-9]{32}$/i.test(md5)) return { status: "error", message: "Invalid KHQR md5", code: "invalid_md5" };

  let res: Response;
  try {
    res = await fetch(`${BAKONG_API_BASE.replace(/\/$/, "")}/v1/check_transaction_by_md5`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${BAKONG_API_TOKEN}`,
      },
      body: JSON.stringify({ md5 }),
      signal: AbortSignal.timeout(opts.timeoutMs ?? BAKONG_TIMEOUT_MS),
    });
  } catch (err) {
    const name = err instanceof Error ? err.name : "";
    if (name === "TimeoutError" || name === "AbortError") {
      return { status: "error", message: "Bakong API timed out", code: "timeout" };
    }
    return {
      status: "error",
      message: `Bakong API request failed: ${err instanceof Error ? err.message : String(err)}`,
      code: "network",
    };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      status: "error",
      message: `Bakong API token rejected (HTTP ${res.status}); renew BAKONG_API_TOKEN at api-bakong.nbc.gov.kh`,
      code: "auth",
    };
  }
  if (!res.ok) return { status: "error", message: `Bakong API HTTP ${res.status}`, code: "http" };

  let body: BakongResponse;
  try {
    body = (await res.json()) as BakongResponse;
  } catch {
    return { status: "error", message: "Bakong API returned invalid JSON", code: "bad_response" };
  }
  if (!body || typeof body !== "object") {
    return { status: "error", message: "Bakong API returned an unexpected body", code: "bad_response" };
  }

  if (body.responseCode === 0 && body.data && typeof body.data === "object") {
    const amount = Number(body.data.amount);
    const currency = str(body.data.currency);
    if (!Number.isFinite(amount) || !currency) {
      return { status: "error", message: "Bakong transaction is missing amount/currency", code: "bad_response" };
    }
    return {
      status: "paid",
      ref: str(body.data.hash) ?? str(body.data.externalRef),
      amount,
      currency: currency.toUpperCase(),
      toAccountId: str(body.data.toAccountId),
      raw: body,
    };
  }
  if (body.responseCode === 1 && (body.errorCode == null || UNPAID_ERROR_CODES.has(body.errorCode))) {
    return { status: "unpaid" };
  }
  return {
    status: "error",
    message: `Bakong API error${body.errorCode != null ? ` ${body.errorCode}` : ""}: ${
      body.responseMessage ?? "unknown"
    }`,
    code: "api_error",
  };
}
