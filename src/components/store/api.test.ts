import { afterEach, describe, expect, it, vi } from "vitest";
import { createTranslator } from "@/i18n/translate";
import { apiRequest, errorMessage } from "./api";

function mockFetch(impl: () => Promise<Response>) {
  const fn = vi.fn(impl);
  vi.stubGlobal("fetch", fn);
  return fn;
}

afterEach(() => vi.unstubAllGlobals());

describe("apiRequest", () => {
  it("POSTs JSON and returns data on success", async () => {
    const fetchMock = mockFetch(async () => Response.json({ ok: true, playerName: "Fox" }));
    const res = await apiRequest<{ playerName: string }>("/api/players/lookup", { body: { gameSlug: "x" } });
    expect(res).toEqual({ ok: true, status: 200, data: { ok: true, playerName: "Fox" } });
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/players/lookup");
    expect(init.method).toBe("POST");
    expect(init.body).toBe('{"gameSlug":"x"}');
  });

  it("uses GET without a body", async () => {
    const fetchMock = mockFetch(async () => Response.json({ order: { code: "SK1" } }));
    await apiRequest("/api/orders/SK1");
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].method).toBe("GET");
  });

  it("returns the error code, field and body of API errors", async () => {
    mockFetch(async () => Response.json({ error: "not_pending", order: { code: "SK1" } }, { status: 409 }));
    const res = await apiRequest("/api/orders/SK1/cancel", { method: "POST", body: {} });
    expect(res).toMatchObject({ ok: false, status: 409, error: "not_pending", body: { order: { code: "SK1" } } });
  });

  it("treats { ok: false } as an error even with a 200 status", async () => {
    mockFetch(async () => Response.json({ ok: false, error: "expired" }));
    expect(await apiRequest("/api/promo/validate", { body: {} })).toMatchObject({ ok: false, error: "expired" });
  });

  it("maps non-JSON failures and network errors", async () => {
    mockFetch(async () => new Response("<html>Bad gateway</html>", { status: 502 }));
    expect(await apiRequest("/x")).toMatchObject({ ok: false, status: 502, error: "generic" });
    mockFetch(async () => new Response("slow down", { status: 429 }));
    expect(await apiRequest("/x")).toMatchObject({ ok: false, error: "rate_limited" });
    mockFetch(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await apiRequest("/x")).toMatchObject({ ok: false, status: 0, error: "network" });
  });

  it("rethrows aborts so callers can ignore superseded requests", async () => {
    mockFetch(async () => {
      throw new DOMException("aborted", "AbortError");
    });
    await expect(apiRequest("/x")).rejects.toThrow("aborted");
  });
});

describe("errorMessage", () => {
  const t = createTranslator({ game: { errors: { invalid_id: "Bad ID", generic: "Oops" } } });
  it("translates known codes and falls back to generic", () => {
    expect(errorMessage(t, "game.errors", "invalid_id")).toBe("Bad ID");
    expect(errorMessage(t, "game.errors", "server_error")).toBe("Oops");
  });
});
