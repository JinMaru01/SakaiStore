import { afterEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { GET } from "./route";

afterEach(() => vi.restoreAllMocks());

describe("GET /api/health", () => {
  it("reports ok when the database answers", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await res.json()).toEqual({ ok: true, db: "ok" });
  });

  it("returns 503 without details when the database is down", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(db, "execute").mockRejectedValueOnce(new Error("connect ECONNREFUSED 10.0.0.5:5432"));
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ ok: false, db: "down" });
  });
});
