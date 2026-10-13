import "dotenv/config";
import { eq, sql } from "drizzle-orm";
import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../src/db/schema";
import { games, packages, promoCodes, settings } from "../src/db/schema";

/**
 * Seed the catalog with popular games in Cambodia.
 *
 *   npm run db:seed            # insert missing games/packages/promos/settings (safe to re-run)
 *   npm run db:seed -- --reset # wipe catalog (games, packages, promo codes) and re-seed
 *
 * ⚠️ PRICES ARE SAMPLE VALUES. Set your real prices in /admin/games before launch.
 * Existing games keep their packages; packages are only inserted for games
 * that have none, so admin edits are never overwritten.
 */

type SeedPackage = {
  name: string;
  amount?: number;
  bonus?: number;
  price: number; // USD
  compareAt?: number;
  badge?: string;
};

type SeedGame = Omit<schema.NewGame, "id" | "createdAt" | "updatedAt"> & { packages: SeedPackage[] };

const dm = (amount: number, bonus: number, price: number, badge?: string): SeedPackage => ({
  name: `${amount + bonus} Diamonds`,
  amount,
  bonus,
  price,
  badge,
});

export const SEED_GAMES: SeedGame[] = [
  {
    slug: "mobile-legends",
    name: "Mobile Legends: Bang Bang",
    publisher: "Moonton",
    tagline: "Diamonds, Weekly Pass & Twilight Pass",
    description:
      "Top up Mobile Legends diamonds instantly with KHQR. Enter your User ID and Zone ID, pick a package, scan and pay.",
    currencyName: "Diamonds",
    accentColor: "#3b6cff",
    idLabel: "User ID",
    idPattern: "^\\d{5,12}$",
    idHelp:
      "Open your profile in-game. The first number is your User ID and the number in brackets is your Zone ID, e.g. 123456789 (1234).",
    requiresZone: true,
    zoneLabel: "Zone ID",
    zonePattern: "^\\d{3,6}$",
    hashtags: "#MLBB #MobileLegends #MLBBCambodia",
    featured: true,
    sortOrder: 1,
    packages: [
      { name: "Weekly Diamond Pass", price: 1.45, badge: "hot" },
      dm(10, 1, 0.25),
      dm(20, 2, 0.45),
      dm(51, 5, 1.05),
      dm(78, 8, 1.5, "best"),
      dm(156, 16, 2.95),
      dm(234, 23, 4.35),
      dm(312, 32, 5.85),
      dm(390, 39, 7.2),
      dm(468, 46, 8.65),
      dm(625, 81, 11.6),
      dm(1250, 162, 23.0),
      dm(1860, 335, 34.5),
      dm(3099, 589, 57.0),
      dm(4649, 883, 86.0),
      dm(7740, 1548, 142.0),
      { name: "Twilight Pass", price: 8.5 },
    ],
  },
  {
    slug: "free-fire",
    name: "Free Fire",
    publisher: "Garena",
    tagline: "Diamonds & Memberships",
    description: "Top up Free Fire diamonds with your Player ID. Pay with any Cambodian bank app via KHQR.",
    currencyName: "Diamonds",
    accentColor: "#ff7a00",
    idLabel: "Player ID",
    idPattern: "^\\d{6,12}$",
    idHelp: "Tap your avatar on the lobby screen. Your Player ID is shown under your nickname.",
    requiresZone: false,
    hashtags: "#FreeFire #FreeFireCambodia #GarenaFreeFire",
    featured: true,
    sortOrder: 2,
    packages: [
      { name: "Weekly Membership", price: 1.85, badge: "hot" },
      { name: "Monthly Membership", price: 8.5 },
      dm(25, 0, 0.3),
      dm(100, 0, 1.0),
      dm(310, 0, 3.0, "best"),
      dm(520, 0, 5.0),
      dm(1060, 0, 10.0),
      dm(2180, 0, 20.0),
      dm(5600, 0, 50.0),
    ],
  },
  {
    slug: "pubg-mobile",
    name: "PUBG Mobile",
    publisher: "Level Infinite",
    tagline: "UC top-up, global server",
    description: "Buy PUBG Mobile UC with your Character ID. Delivered fast after KHQR payment.",
    currencyName: "UC",
    accentColor: "#f2a900",
    idLabel: "Character ID",
    idPattern: "^\\d{5,15}$",
    idHelp: "Tap your avatar in the top-left of the lobby. Your Character ID is under your name.",
    requiresZone: false,
    hashtags: "#PUBGMobile #PUBGM #PUBGCambodia",
    featured: true,
    sortOrder: 3,
    packages: [
      { name: "60 UC", amount: 60, price: 0.99 },
      { name: "325 UC", amount: 300, bonus: 25, price: 4.8, badge: "best" },
      { name: "660 UC", amount: 600, bonus: 60, price: 9.5 },
      { name: "1800 UC", amount: 1500, bonus: 300, price: 24.0 },
      { name: "3850 UC", amount: 3000, bonus: 850, price: 47.5 },
      { name: "8100 UC", amount: 6000, bonus: 2100, price: 95.0 },
    ],
  },
  {
    slug: "honor-of-kings",
    name: "Honor of Kings",
    publisher: "Level Infinite",
    tagline: "Tokens & Weekly Card",
    description: "Top up Honor of Kings tokens using your Player ID.",
    currencyName: "Tokens",
    accentColor: "#c9a227",
    idLabel: "Player ID",
    idPattern: "^\\d{6,20}$",
    idHelp: "Open your profile in-game and copy the number under your nickname.",
    requiresZone: false,
    hashtags: "#HonorOfKings #HOK",
    featured: true,
    sortOrder: 4,
    packages: [
      { name: "Weekly Card", price: 1.2, badge: "hot" },
      { name: "16 Tokens", amount: 16, price: 0.25 },
      { name: "80 Tokens", amount: 80, price: 1.2 },
      { name: "240 Tokens", amount: 240, price: 3.5 },
      { name: "400 Tokens", amount: 400, price: 5.8, badge: "best" },
      { name: "560 Tokens", amount: 560, price: 8.0 },
      { name: "830 Tokens", amount: 830, price: 11.8 },
      { name: "1245 Tokens", amount: 1245, price: 17.5 },
      { name: "2508 Tokens", amount: 2508, price: 35.0 },
      { name: "4180 Tokens", amount: 4180, price: 58.0 },
    ],
  },
  {
    slug: "genshin-impact",
    name: "Genshin Impact",
    publisher: "HoYoverse",
    tagline: "Genesis Crystals & Welkin Moon",
    description: "Top up Genshin Impact Genesis Crystals with your UID and server.",
    currencyName: "Genesis Crystals",
    accentColor: "#4cc9f0",
    idLabel: "UID",
    idPattern: "^\\d{9,10}$",
    idHelp: "Your UID is shown at the bottom-right of the screen in-game (Paimon menu).",
    requiresZone: true,
    zoneLabel: "Server",
    zoneOptions: [
      { value: "os_asia", label: "Asia" },
      { value: "os_usa", label: "America" },
      { value: "os_euro", label: "Europe" },
      { value: "os_cht", label: "TW, HK, MO" },
    ],
    hashtags: "#GenshinImpact #Genshin",
    featured: false,
    sortOrder: 5,
    packages: [
      { name: "Blessing of the Welkin Moon", price: 4.9, badge: "hot" },
      { name: "60 Genesis Crystals", amount: 60, price: 0.99 },
      { name: "330 Genesis Crystals", amount: 300, bonus: 30, price: 4.9 },
      { name: "1090 Genesis Crystals", amount: 980, bonus: 110, price: 14.5, badge: "best" },
      { name: "2240 Genesis Crystals", amount: 1980, bonus: 260, price: 29.5 },
      { name: "3880 Genesis Crystals", amount: 3280, bonus: 600, price: 48.5 },
      { name: "8080 Genesis Crystals", amount: 6480, bonus: 1600, price: 96.0 },
    ],
  },
  {
    slug: "call-of-duty-mobile",
    name: "Call of Duty: Mobile",
    publisher: "Activision",
    tagline: "CP top-up",
    description: "Buy COD Mobile CP with your Player UID.",
    currencyName: "CP",
    accentColor: "#8bc34a",
    idLabel: "Player UID",
    idPattern: "^\\d{6,20}$",
    idHelp: "Open your profile in-game; the UID is under your player name.",
    requiresZone: false,
    hashtags: "#CODM #CallOfDutyMobile",
    featured: false,
    sortOrder: 6,
    packages: [
      { name: "80 CP", amount: 80, price: 0.99 },
      { name: "420 CP", amount: 420, price: 4.9 },
      { name: "880 CP", amount: 880, price: 9.7, badge: "best" },
      { name: "2400 CP", amount: 2400, price: 24.0 },
      { name: "5000 CP", amount: 5000, price: 48.0 },
      { name: "10800 CP", amount: 10800, price: 96.0 },
    ],
  },
  {
    slug: "magic-chess-go-go",
    name: "Magic Chess: Go Go",
    publisher: "Moonton",
    tagline: "Diamonds & Weekly Pass",
    description: "Top up Magic Chess: Go Go diamonds with your User ID and Zone ID.",
    currencyName: "Diamonds",
    accentColor: "#9b5de5",
    idLabel: "User ID",
    idPattern: "^\\d{5,12}$",
    idHelp: "Open your profile in-game. The User ID is first, the Zone ID is in brackets.",
    requiresZone: true,
    zoneLabel: "Zone ID",
    zonePattern: "^\\d{3,6}$",
    hashtags: "#MagicChessGoGo #MagicChess",
    featured: false,
    sortOrder: 7,
    packages: [
      { name: "Weekly Diamond Pass", price: 1.45, badge: "hot" },
      dm(10, 1, 0.25),
      dm(20, 2, 0.45),
      dm(51, 5, 1.05),
      dm(78, 8, 1.5, "best"),
      dm(156, 16, 2.95),
    ],
  },
  {
    slug: "blood-strike",
    name: "Blood Strike",
    publisher: "NetEase",
    tagline: "Gold & Strike Pass",
    description: "Top up Blood Strike Gold with your Player ID.",
    currencyName: "Gold",
    accentColor: "#e63946",
    idLabel: "Player ID",
    idPattern: "^\\d{6,20}$",
    idHelp: "Tap your avatar in the lobby; the ID is under your nickname.",
    requiresZone: false,
    hashtags: "#BloodStrike",
    featured: false,
    sortOrder: 8,
    packages: [
      { name: "Strike Pass Elite", price: 4.9, badge: "hot" },
      { name: "100 Gold", amount: 100, price: 0.99 },
      { name: "320 Gold", amount: 300, bonus: 20, price: 2.95 },
      { name: "540 Gold", amount: 500, bonus: 40, price: 4.9, badge: "best" },
      { name: "1100 Gold", amount: 1000, bonus: 100, price: 9.8 },
      { name: "2260 Gold", amount: 2000, bonus: 260, price: 19.5 },
    ],
  },
];

export const SEED_PROMOS: Omit<schema.NewPromoCode, "id" | "createdAt" | "updatedAt">[] = [
  {
    code: "WELCOME5",
    description: "5% off your first top-up (max $1)",
    type: "percent",
    value: 5,
    maxDiscountCents: 100,
    channel: null,
  },
  {
    code: "FB5",
    description: "5% off for our Facebook fans (max $2)",
    type: "percent",
    value: 5,
    maxDiscountCents: 200,
    channel: "facebook",
  },
  {
    code: "TIKTOK5",
    description: "5% off for TikTok followers (max $2)",
    type: "percent",
    value: 5,
    maxDiscountCents: 200,
    channel: "tiktok",
  },
  {
    code: "FOLLOW10",
    description: "10% off orders over $5 for followers (max $2)",
    type: "percent",
    value: 10,
    minOrderCents: 500,
    maxDiscountCents: 200,
    channel: "facebook",
  },
];

const SEED_SETTINGS: Record<string, unknown> = {
  social: {
    // Placeholders — replace with your real page links in /admin/settings.
    facebookUrl: "https://www.facebook.com/sakaistore",
    tiktokUrl: "https://www.tiktok.com/@sakaistore",
    telegramUrl: "https://t.me/sakaistore",
    messengerUrl: "https://m.me/sakaistore",
    youtubeUrl: "",
    instagramUrl: "",
  },
  marketing: {
    followPromoCode: "FOLLOW10",
    defaultHashtags: "#SakaiStore #GameTopUp #Cambodia #TopUpKH",
  },
};

const cents = (usd: number) => Math.round(usd * 100);

export async function seed(db: NodePgDatabase<typeof schema>, opts: { reset?: boolean } = {}) {
  if (opts.reset) {
    await db.execute(sql`TRUNCATE packages, games, promo_codes RESTART IDENTITY CASCADE`);
  }

  for (const [i, { packages: pkgs, ...game }] of SEED_GAMES.entries()) {
    const [row] = await db
      .insert(games)
      .values(game)
      .onConflictDoNothing({ target: games.slug })
      .returning({ id: games.id });
    const gameId =
      row?.id ??
      (await db.select({ id: games.id }).from(games).where(eq(games.slug, game.slug)))[0]!.id;

    const existing = await db.select({ id: packages.id }).from(packages).where(eq(packages.gameId, gameId)).limit(1);
    if (existing.length === 0) {
      await db.insert(packages).values(
        pkgs.map((p, idx) => ({
          gameId,
          name: p.name,
          amount: p.amount ?? 0,
          bonus: p.bonus ?? 0,
          priceCents: cents(p.price),
          compareAtCents: p.compareAt ? cents(p.compareAt) : null,
          badge: p.badge ?? null,
          sortOrder: idx,
        })),
      );
    }
    console.log(`  ${i + 1}. ${game.name}${row ? "" : " (exists)"}`);
  }

  await db.insert(promoCodes).values(SEED_PROMOS).onConflictDoNothing({ target: promoCodes.code });
  for (const [key, value] of Object.entries(SEED_SETTINGS)) {
    await db.insert(settings).values({ key, value }).onConflictDoNothing({ target: settings.key });
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const pool = new Pool({
    connectionString: url,
    ssl: process.env.DATABASE_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });
  const db = drizzle(pool, { schema });
  const reset = process.argv.includes("--reset");
  console.log(reset ? "Resetting and seeding catalog…" : "Seeding catalog…");
  await seed(db, { reset });
  await pool.end();
  console.log("✓ seed complete (sample prices — edit them in /admin/games)");
}

// Run only when executed directly (tests import `seed`).
if (process.argv[1]?.endsWith("seed.ts")) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
