import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const auth = vi.hoisted(() => ({ admin: true }));

vi.mock("@/lib/auth", () => ({
  requireAdminApi: vi.fn(async () => (auth.admin ? null : Response.json({ error: "unauthorized" }, { status: 401 }))),
}));

import { resetDb, seedCatalog } from "../../../../../tests/helpers/db";
import { GET } from "./route";

const ctx = (slug: string) => ({ params: Promise.resolve({ slug }) });
const get = (slug: string, query = "") => GET(new Request(`http://localhost:3000/api/promo-image/${slug}${query}`), ctx(slug));

async function pngSize(res: Response) {
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect([...bytes.slice(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  const view = new DataView(bytes.buffer);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

beforeAll(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
});

beforeEach(() => {
  auth.admin = true;
});

describe("GET /api/promo-image/[slug]", () => {
  it("is admin-only", async () => {
    auth.admin = false;
    const res = await get("mobile-legends");
    expect(res.status).toBe(401);
  });

  it("renders a private square PNG by default, inline", { timeout: 30_000 }, async () => {
    const res = await get("mobile-legends");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(res.headers.get("cache-control")).toMatch(/^private/);
    expect(res.headers.get("content-disposition")).toBe('inline; filename="sakai-store-mobile-legends-square.png"');
    expect(await pngSize(res)).toEqual({ width: 1080, height: 1080 });
  });

  it.each([
    ["portrait", 1350],
    ["story", 1920],
  ])("renders the %s format", { timeout: 30_000 }, async (format, height) => {
    const res = await get("free-fire", `?format=${format}&code=TIKTOK5`);
    expect(res.status).toBe(200);
    expect(await pngSize(res)).toEqual({ width: 1080, height });
  });

  it("renders the all-games poster as a download", { timeout: 30_000 }, async () => {
    const res = await get("all", "?format=story&download=1&code=none");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-disposition")).toBe('attachment; filename="sakai-store-all-story.png"');
    expect(await pngSize(res)).toEqual({ width: 1080, height: 1920 });
  });

  it("validates input", async () => {
    expect((await get("nope-not-a-game")).status).toBe(404);
    expect((await get("..%2F..%2Fetc")).status).toBe(404);
    expect((await get("mobile-legends", "?format=banner")).status).toBe(400);
    const badCode = await get("mobile-legends", "?code=%3Cscript%3E");
    expect(badCode.status).toBe(400);
    expect(await badCode.json()).toEqual({ error: "invalid_code" });
  });
});
