import "server-only";
import type { z } from "zod";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { ATTRIBUTION_COOKIE, decodeAttribution, type Attribution } from "@/lib/attribution";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp, hashIp } from "@/lib/request";
import type { CreateOrderContext } from "./service";

/**
 * Small helpers shared by the public API route handlers (orders, players,
 * promo, cron). They work on the plain Web `Request` (not next/headers) so
 * handlers can be unit-tested by calling the exported GET/POST directly.
 */

const MAX_BODY_BYTES = 16 * 1024;

/** JSON response that is never cached (order state, prices and QR codes are per-request). */
export function json(body: unknown, init: { status?: number; headers?: HeadersInit } = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { status: init.status ?? 200, headers });
}

/** Stable API error: `{ error: "<code>", field? }` (+ extra keys, e.g. `ok: false` or the current order). */
export function errorJson(
  error: string,
  status: number,
  extra: Record<string, unknown> = {},
  headers?: HeadersInit,
): Response {
  return json({ ...extra, error }, { status, headers });
}

/**
 * Per-IP fixed-window rate limit. Returns a 429 response when exceeded, else
 * null. `extra` lets endpoints keep their response shape (promo uses ok:false).
 */
export function rateLimitResponse(
  request: Request,
  bucket: string,
  limit: number,
  windowMs = 60_000,
  extra: Record<string, unknown> = {},
): Response | null {
  const result = rateLimit(`${bucket}:${getClientIp(request.headers)}`, limit, windowMs);
  if (result.ok) return null;
  const retryAfter = Math.max(1, Math.ceil(result.retryAfterMs / 1000));
  return errorJson("rate_limited", 429, extra, { "Retry-After": String(retryAfter) });
}

/** Raw cookie value from the Cookie header (no decoding; works for Request and NextRequest). */
export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.get("cookie");
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq > 0 && part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return undefined;
}

function safeDecode(v: string): string {
  try {
    return decodeURIComponent(v);
  } catch {
    return v;
  }
}

/** Last non-direct-touch attribution from `sk_attr`; tolerates the value being URI-encoded once more by a cookie API. */
export function readAttribution(request: Request): Attribution | null {
  const raw = readCookie(request, ATTRIBUTION_COOKIE);
  if (!raw) return null;
  return decodeAttribution(raw) ?? decodeAttribution(safeDecode(raw));
}

export function readLocale(request: Request): Locale {
  const v = readCookie(request, LOCALE_COOKIE);
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Everything createOrder needs to know about the request besides the body. */
export function orderContextFromRequest(request: Request): CreateOrderContext {
  return {
    attribution: readAttribution(request),
    ipHash: hashIp(getClientIp(request.headers)),
    userAgent: request.headers.get("user-agent")?.slice(0, 300) ?? null,
    locale: readLocale(request),
  };
}

/**
 * Read the body as text, giving up as soon as it exceeds `max` bytes — a
 * chunked upload has no Content-Length, so we can't trust the header alone.
 */
async function readTextCapped(request: Request, max: number): Promise<string | undefined> {
  if (Number(request.headers.get("content-length") ?? 0) > max) return undefined;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) {
        await reader.cancel().catch(() => {});
        return undefined;
      }
      chunks.push(value);
    }
  } catch {
    return undefined;
  }
  return Buffer.concat(chunks).toString("utf8");
}

/** Parse a small JSON body; undefined when missing, too large or malformed. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const text = await readTextCapped(request, MAX_BODY_BYTES);
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

/** Top-level field name of the first zod issue (for `{ field }` in error responses). */
export function firstIssueField(error: z.ZodError): string | undefined {
  const key = error.issues[0]?.path[0];
  return typeof key === "string" ? key : undefined;
}
