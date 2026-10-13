import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth", () => ({ requireAdmin: vi.fn(async () => ({ sub: "admin" })) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { IDLE } from "@/lib/admin/forms";
import { getSettings } from "@/lib/settings";
import { resetDb, seedCatalog } from "../../../../../tests/helpers/db";
import { saveSettingsAction } from "./actions";

const fd = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
});

describe("saveSettingsAction", () => {
  it("saves the store section and strips @ from the Telegram username", async () => {
    const result = await saveSettingsAction(
      "store",
      IDLE,
      fd({
        name: "Sakai Store KH",
        "tagline.en": "Cheapest top-up",
        "tagline.km": "បញ្ចូលថោក",
        "announcement.en": "",
        "announcement.km": "",
        supportPhone: "012 345 678",
        supportTelegram: "@sakai_support",
        khrPerUsd: "4050",
      }),
    );
    expect(result).toMatchObject({ status: "success" });
    const { store } = await getSettings();
    expect(store).toMatchObject({ name: "Sakai Store KH", supportTelegram: "sakai_support", khrPerUsd: 4050 });
  });

  it("returns per-field errors with dotted names", async () => {
    const result = await saveSettingsAction("store", IDLE, fd({ name: "", "tagline.en": "x".repeat(600), khrPerUsd: "5" }));
    expect(result.status === "error" && Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "khrPerUsd",
      "name",
      "tagline.en",
    ]);
    const social = await saveSettingsAction("social", IDLE, fd({ facebookUrl: "facebook.com/page" }));
    expect(social).toMatchObject({ status: "error", fieldErrors: { facebookUrl: expect.any(String) } });
  });

  it("warns when the follower promo code does not exist", async () => {
    const missing = await saveSettingsAction("marketing", IDLE, fd({ followPromoCode: "nope99", defaultHashtags: "#A" }));
    expect(missing).toMatchObject({ status: "success", message: expect.stringContaining("NOPE99 does not exist") });
    const ok = await saveSettingsAction("marketing", IDLE, fd({ followPromoCode: "follow10", defaultHashtags: "#A" }));
    expect(ok).toMatchObject({ status: "success", message: "Settings saved." });
    expect((await getSettings()).marketing.followPromoCode).toBe("FOLLOW10");
  });

  it("rejects unknown sections", async () => {
    expect(await saveSettingsAction("secrets" as "store", IDLE, fd({}))).toMatchObject({ status: "error" });
  });
});
