import type { TranslateFn } from "@/i18n/translate";

/**
 * Tiny JSON client for the public storefront API (docs/ARCHITECTURE.md
 * "Public HTTP API"). Errors are `{ error: "<code>", field? }`; network
 * failures map to the pseudo-code "network".
 */

export type ApiResult<T> =
  | { ok: true; status: number; data: T }
  | { ok: false; status: number; error: string; field?: string; body?: unknown };

export async function apiRequest<T>(
  url: string,
  init: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal } = {},
): Promise<ApiResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? { accept: "application/json" } : { "content-type": "application/json", accept: "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      cache: "no-store",
      signal: init.signal,
    });
  } catch (err) {
    if ((err as Error)?.name === "AbortError") throw err;
    return { ok: false, status: 0, error: "network" };
  }
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // non-JSON (e.g. proxy error page)
  }
  const body = (json ?? {}) as { error?: unknown; field?: unknown; ok?: unknown };
  if (res.ok && body.ok !== false) return { ok: true, status: res.status, data: json as T };
  return {
    ok: false,
    status: res.status,
    error: typeof body.error === "string" ? body.error : res.status === 429 ? "rate_limited" : "generic",
    field: typeof body.field === "string" ? body.field : undefined,
    // Some errors carry the current state, e.g. 409 not_pending returns { error, order }.
    body: json ?? undefined,
  };
}

/**
 * Translate an API error code via `<prefix>.<code>`, falling back to
 * `<prefix>.generic` when there is no message for that code.
 */
export function errorMessage(t: TranslateFn, prefix: string, code: string): string {
  const key = `${prefix}.${code}`;
  const msg = t(key);
  return msg === key ? t(`${prefix}.generic`) : msg;
}
