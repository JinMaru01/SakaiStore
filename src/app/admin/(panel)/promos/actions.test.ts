import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn(async () => ({ sub: "admin" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw Object.assign(new Error("NEXT_REDIRECT"), { url });
  }),
}));

import { db } from "@/db";
import { promoCodes } from "@/db/schema";
import { IDLE } from "@/lib/admin/forms";
import { resetDb, seedCatalog } from "../../../../../tests/helpers/db";
import { deletePromoAction, savePromoAction, togglePromoAction } from "./actions";

const fd = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

const base = { code: "tiktok10", type: "percent", value: "10", maxDiscount: "2", channel: "tiktok", active: "on" };

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
});

const byCode = async (code: string) => (await db.select().from(promoCodes).where(eq(promoCodes.code, code)))[0];

describe("promo actions", () => {
  it("creates a code (uppercased) and redirects to the list", async () => {
    await expect(savePromoAction(null, IDLE, fd(base))).rejects.toMatchObject({ url: "/admin/promos?flash=promo_created" });
    expect(await byCode("TIKTOK10")).toMatchObject({
      type: "percent",
      value: 10,
      maxDiscountCents: 200,
      channel: "tiktok",
      active: true,
      usedCount: 0,
    });
  });

  it("rejects duplicates and invalid values with field errors", async () => {
    const dup = await savePromoAction(null, IDLE, fd({ ...base, code: "fb5" }));
    expect(dup).toMatchObject({ status: "error", fieldErrors: { code: expect.stringContaining("FB5") } });
    const bad = await savePromoAction(null, IDLE, fd({ ...base, value: "150", gameId: "999999" }));
    expect(bad).toMatchObject({ status: "error", fieldErrors: { value: expect.any(String) } });
    const noGame = await savePromoAction(null, IDLE, fd({ ...base, gameId: "999999" }));
    expect(noGame).toMatchObject({ status: "error", fieldErrors: { gameId: expect.any(String) } });
  });

  it("updates without touching usage, toggles and deletes", async () => {
    const fb5 = (await byCode("FB5"))!;
    await db.update(promoCodes).set({ usedCount: 7 }).where(eq(promoCodes.id, fb5.id));
    const result = await savePromoAction(fb5.id, IDLE, fd({ code: "FB5", type: "fixed", value: "0.50", channel: "facebook" }));
    expect(result).toMatchObject({ status: "success" });
    expect(await byCode("FB5")).toMatchObject({ type: "fixed", value: 50, usedCount: 7, active: false });

    await togglePromoAction(fd({ promoId: String(fb5.id), value: "true" }));
    expect((await byCode("FB5"))!.active).toBe(true);

    await expect(deletePromoAction(IDLE, fd({ promoId: String(fb5.id) }))).rejects.toMatchObject({
      url: "/admin/promos?flash=promo_deleted",
    });
    expect(await byCode("FB5")).toBeUndefined();
    expect(await deletePromoAction(IDLE, fd({ promoId: String(fb5.id) }))).toMatchObject({ status: "error" });
  });
});
