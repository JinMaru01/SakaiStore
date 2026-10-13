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
import { games, promoCodes } from "@/db/schema";
import { IDLE } from "@/lib/admin/forms";
import { EMPTY_GAME, type GameEditorValues, type PackageFormValues } from "@/lib/admin/game-schema";
import { getAdminGame, listAdminGames } from "@/lib/admin/games";
import { resetDb, seedCatalog } from "../../../../../tests/helpers/db";
import { deleteGameAction, moveGameAction, saveGameAction, toggleGameFlagAction } from "./actions";

const pkg = (over: Partial<PackageFormValues> = {}): PackageFormValues => ({
  key: Math.random().toString(36),
  id: null,
  name: "100 Gold",
  amount: "100",
  bonus: "0",
  price: "0.99",
  compareAt: "",
  badge: "",
  supplierSku: "",
  active: true,
  ...over,
});

const values = (over: Partial<GameEditorValues["game"]> = {}, packages = [pkg()]): GameEditorValues => ({
  game: { ...EMPTY_GAME, name: "Arena Breakout", slug: "arena-breakout", ...over },
  packages,
});

const fd = (fields: Record<string, string | number>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, String(v));
  return f;
};

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
});

describe("saveGameAction", () => {
  it("creates a game and returns saved values with package ids", async () => {
    const result = await saveGameAction(null, values({}, [pkg({ name: "A", price: "1" }), pkg({ name: "B", price: "2.5" })]));
    expect(result.status).toBe("success");
    if (result.status !== "success") return;
    expect(result.values.game.slug).toBe("arena-breakout");
    expect(result.values.packages.map((p) => [p.name, p.price, typeof p.id])).toEqual([
      ["A", "1.00", "number"],
      ["B", "2.50", "number"],
    ]);

    // Saving the returned values again must keep the same package ids (no delete + re-insert).
    const again = await saveGameAction(result.id, result.values);
    expect(again.status === "success" && again.values.packages.map((p) => p.id)).toEqual(
      result.values.packages.map((p) => p.id),
    );
  });

  it("reports field errors for the game and individual packages", async () => {
    const result = await saveGameAction(
      null,
      values({ name: "", idPattern: "([", accentColor: "blue" }, [pkg(), pkg({ price: "abc" })]),
    );
    expect(result.status).toBe("error");
    expect(result.status === "error" && Object.keys(result.fieldErrors ?? {}).sort()).toEqual([
      "accentColor",
      "idPattern",
      "name",
      "packages.1.price",
    ]);
  });

  it("rejects a slug used by another game", async () => {
    const result = await saveGameAction(null, values({ slug: "free-fire" }));
    expect(result).toMatchObject({ status: "error", fieldErrors: { slug: expect.any(String) } });
  });

  it("rejects garbage input without throwing", async () => {
    const result = await saveGameAction(null, null as unknown as GameEditorValues);
    expect(result.status).toBe("error");
    expect((await saveGameAction(-1, values())).status).toBe("error");
  });
});

describe("deleteGameAction", () => {
  it("requires the exact slug, then deletes and redirects", async () => {
    const ff = (await listAdminGames()).find((g) => g.slug === "free-fire")!;
    const wrong = await deleteGameAction(IDLE, fd({ gameId: ff.id, confirmSlug: "free" }));
    expect(wrong).toMatchObject({ status: "error", fieldErrors: { confirmSlug: expect.any(String) } });
    expect(await getAdminGame(ff.id)).not.toBeNull();

    await db.insert(promoCodes).values({ code: "FFONLY", type: "fixed", value: 50, gameId: ff.id });
    await expect(deleteGameAction(IDLE, fd({ gameId: ff.id, confirmSlug: " Free-Fire " }))).rejects.toMatchObject({
      url: "/admin/games?flash=game_deleted",
    });
    expect(await getAdminGame(ff.id)).toBeNull();
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, "FFONLY"));
    expect(promo!.active).toBe(false);
  });
});

describe("list actions", () => {
  it("toggles flags and moves games", async () => {
    const [first, second] = await listAdminGames();
    await toggleGameFlagAction(fd({ gameId: first!.id, flag: "active", value: "false" }));
    const [row] = await db.select().from(games).where(eq(games.id, first!.id));
    expect(row!.active).toBe(false);

    await moveGameAction(fd({ gameId: second!.id, direction: "up" }));
    expect((await listAdminGames())[0]!.id).toBe(second!.id);

    // Invalid input is ignored.
    await toggleGameFlagAction(fd({ gameId: first!.id, flag: "price", value: "true" }));
  });
});
