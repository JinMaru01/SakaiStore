import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { games, orders, packages, promoCodes } from "@/db/schema";
import { resetDb, seedCatalog } from "../../../tests/helpers/db";
import { EMPTY_GAME, gameFormSchema, packageFormSchema, type PackageFormValues } from "./game-schema";
import {
  deleteGame,
  getAdminGame,
  isSlugTaken,
  listAdminGames,
  moveGame,
  saveGame,
  setGameFlag,
  StalePackagesError,
} from "./games";
import { insertTestOrder } from "./test-orders";

const gameData = (over: Partial<typeof EMPTY_GAME> = {}) =>
  gameFormSchema.parse({ ...EMPTY_GAME, name: "Test Game", slug: "test-game", ...over });

const pkg = (over: Partial<PackageFormValues> = {}) =>
  packageFormSchema.parse({
    key: "k",
    id: null,
    name: "10 Gems",
    amount: "10",
    bonus: "0",
    price: "1.00",
    compareAt: "",
    badge: "",
    supplierSku: "",
    active: true,
    ...over,
  });

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  await seedCatalog();
  log.mockRestore();
});

describe("listAdminGames", () => {
  it("includes inactive games and counts all vs active packages", async () => {
    const ml = (await getAdminGame((await listAdminGames())[0]!.id))!;
    await db.update(packages).set({ active: false }).where(eq(packages.id, ml.packages[0]!.id));
    await db.update(games).set({ active: false }).where(eq(games.slug, "free-fire"));
    const list = await listAdminGames();
    const row = list.find((g) => g.slug === "mobile-legends")!;
    expect(row.packageCount).toBe(17);
    expect(row.activePackageCount).toBe(16);
    expect(list.some((g) => g.slug === "free-fire" && !g.active)).toBe(true);
  });
});

describe("saveGame", () => {
  it("creates a game with ordered packages", async () => {
    const id = (await saveGame(null, gameData(), [pkg({ name: "B", price: "2" }), pkg({ name: "A" })]))!;
    const saved = (await getAdminGame(id))!;
    expect(saved.slug).toBe("test-game");
    expect(saved.packages.map((p) => [p.name, p.sortOrder, p.priceCents])).toEqual([
      ["B", 0, 200],
      ["A", 1, 100],
    ]);
  });

  it("updates, inserts, deletes and reorders packages while keeping ids", async () => {
    const id = (await saveGame(null, gameData(), [pkg({ name: "one" }), pkg({ name: "two" }), pkg({ name: "three" })]))!;
    const [one, two, three] = (await getAdminGame(id))!.packages;
    // An order referencing the deleted package keeps its snapshot.
    const order = await insertTestOrder({ gameId: id, packageId: two!.id, packageName: "two" });

    await saveGame(id, gameData({ name: "Renamed" }), [
      pkg({ id: three!.id, name: "three", price: "3.00" }),
      pkg({ id: one!.id, name: "one (edited)", active: false }),
      pkg({ name: "four" }),
    ]);
    const after = (await getAdminGame(id))!;
    expect(after.name).toBe("Renamed");
    expect(after.packages.map((p) => [p.id === three!.id, p.id === one!.id, p.name, p.active, p.priceCents])).toEqual([
      [true, false, "three", true, 300],
      [false, true, "one (edited)", false, 100],
      [false, false, "four", true, 100],
    ]);
    const [kept] = await db.select().from(orders).where(eq(orders.id, order.id));
    expect(kept!.packageId).toBeNull();
    expect(kept!.packageName).toBe("two");
  });

  it("refuses package ids from another game", async () => {
    const id = (await saveGame(null, gameData(), [pkg()]))!;
    const ml = (await listAdminGames()).find((g) => g.slug === "mobile-legends")!;
    const foreign = (await getAdminGame(ml.id))!.packages[0]!;
    await expect(saveGame(id, gameData(), [pkg({ id: foreign.id })])).rejects.toBeInstanceOf(StalePackagesError);
    // Nothing changed for either game.
    expect((await getAdminGame(id))!.packages).toHaveLength(1);
    expect((await getAdminGame(ml.id))!.packages).toHaveLength(17);
  });

  it("returns null when updating a missing game and detects slug conflicts", async () => {
    expect(await saveGame(999_999, gameData(), [])).toBeNull();
    expect(await isSlugTaken("free-fire")).toBe(true);
    const ff = (await listAdminGames()).find((g) => g.slug === "free-fire")!;
    expect(await isSlugTaken("free-fire", ff.id)).toBe(false);
  });
});

describe("deleteGame", () => {
  it("deletes packages and deactivates promo codes limited to the game", async () => {
    const id = (await saveGame(null, gameData(), [pkg()]))!;
    await db.insert(promoCodes).values({ code: "ONLYTEST", type: "percent", value: 10, gameId: id });
    const result = await deleteGame(id);
    expect(result).toEqual({ deleted: true, deactivatedPromos: 1 });
    expect(await getAdminGame(id)).toBeNull();
    expect(await db.select().from(packages).where(eq(packages.gameId, id))).toEqual([]);
    const [promo] = await db.select().from(promoCodes).where(eq(promoCodes.code, "ONLYTEST"));
    // Not silently turned into an all-games code.
    expect(promo).toMatchObject({ active: false, gameId: null });
    expect(await deleteGame(id)).toEqual({ deleted: false, deactivatedPromos: 0 });
  });
});

describe("flags and ordering", () => {
  it("toggles flags", async () => {
    const ff = (await listAdminGames()).find((g) => g.slug === "free-fire")!;
    expect(await setGameFlag(ff.id, "featured", false)).toBe(true);
    expect((await getAdminGame(ff.id))!.featured).toBe(false);
    expect(await setGameFlag(999_999, "active", false)).toBe(false);
  });

  it("moves games and renumbers sort order", async () => {
    const before = (await listAdminGames()).map((g) => g.slug);
    const second = (await listAdminGames())[1]!;
    expect(await moveGame(second.id, "up")).toBe(true);
    const after = await listAdminGames();
    expect(after.map((g) => g.slug)).toEqual([before[1], before[0], ...before.slice(2)]);
    expect(after.map((g) => g.sortOrder)).toEqual(after.map((_, i) => i + 1));
    expect(await moveGame(after[0]!.id, "up")).toBe(false);
    expect(await moveGame(after.at(-1)!.id, "down")).toBe(false);
  });
});
