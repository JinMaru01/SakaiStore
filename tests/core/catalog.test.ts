import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { games, packages } from "@/db/schema";
import { getGameBySlug, getPackageForGame, listGames } from "@/lib/catalog";
import { resetDb, seedCatalog } from "../helpers/db";

beforeEach(async () => {
  await resetDb();
  const log = vi.spyOn(console, "log").mockImplementation(() => {}); // seed progress output
  await seedCatalog();
  log.mockRestore();
});

describe("catalog", () => {
  it("lists active games in sortOrder with their 'from' price", async () => {
    const list = await listGames();
    expect(list.map((g) => g.slug).slice(0, 3)).toEqual(["mobile-legends", "free-fire", "pubg-mobile"]);
    const mlbb = list.find((g) => g.slug === "mobile-legends")!;
    expect(mlbb.minPriceCents).toBe(25);
    expect(mlbb.packageCount).toBe(17);
  });

  it("hides inactive games and packages unless asked", async () => {
    await db.update(games).set({ active: false }).where(eq(games.slug, "free-fire"));
    expect((await listGames()).some((g) => g.slug === "free-fire")).toBe(false);
    expect((await listGames({ includeInactive: true })).some((g) => g.slug === "free-fire")).toBe(true);
    expect(await getGameBySlug("free-fire")).toBeNull();
    expect(await getGameBySlug("free-fire", { includeInactive: true })).not.toBeNull();

    const mlbb = (await getGameBySlug("mobile-legends"))!;
    const cheapest = mlbb.packages.find((p) => p.priceCents === 25)!;
    await db.update(packages).set({ active: false }).where(eq(packages.id, cheapest.id));
    const after = (await listGames()).find((g) => g.slug === "mobile-legends")!;
    expect(after.minPriceCents).toBe(45);
    expect(after.packageCount).toBe(16);
    expect(await getPackageForGame(mlbb.id, cheapest.id)).toBeNull();
    expect(await getPackageForGame(mlbb.id, cheapest.id, { includeInactive: true })).not.toBeNull();
  });

  it("returns null minPrice for a game without packages", async () => {
    const [g] = await db.insert(games).values({ slug: "empty-game", name: "Empty" }).returning();
    const row = (await listGames()).find((x) => x.id === g!.id)!;
    expect(row.minPriceCents).toBeNull();
    expect(row.packageCount).toBe(0);
  });

  it("sorts packages by sortOrder then price", async () => {
    const mlbb = (await getGameBySlug("Mobile-Legends "))!;
    const orders = mlbb.packages.map((p) => p.sortOrder);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(mlbb.packages[0]!.name).toBe("Weekly Diamond Pass");
  });

  it("only returns packages that belong to the game", async () => {
    const mlbb = (await getGameBySlug("mobile-legends"))!;
    const ff = (await getGameBySlug("free-fire"))!;
    expect(await getPackageForGame(mlbb.id, ff.packages[0]!.id)).toBeNull();
    expect((await getPackageForGame(mlbb.id, mlbb.packages[0]!.id))?.id).toBe(mlbb.packages[0]!.id);
    expect(await getPackageForGame(mlbb.id, 9_999_999_999)).toBeNull();
    expect(await getPackageForGame(mlbb.id, -1)).toBeNull();
  });
});
