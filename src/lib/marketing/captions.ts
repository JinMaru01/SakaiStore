import { formatUsd } from "@/lib/utils";
import {
  discountPercent,
  isOnSale,
  isPassPackage,
  minPrice,
  pickHighlightPackages,
  pickListPackages,
  type PromoPackage,
} from "./packages";
import { describeOffer, offerAppliesTo, type PromoOffer } from "./promo-offer";
import { ALL_GAMES_CAMPAIGN, buildUtmLink, withPromoParam } from "./utm";

export { buildUtmLink } from "./utm";

/**
 * Social caption & video script generator for the admin Marketing studio.
 * Pure (no I/O, deterministic for a given `now`) so it is unit-tested and runs
 * in the browser for instant previews.
 *
 * Output per template: a Facebook post, a TikTok caption (hook first, ≤ 2,200
 * characters) and a short-video script (hook 0–3 s, scenes, CTA, on-screen
 * text) — each in English and Khmer. Every link carries UTMs
 * (facebook|tiktok / social / <game slug or template>) so orders are
 * attributed to the post that sold them.
 */

export const CAPTION_TEMPLATES = [
  { id: "price_list", label: "Price list", description: "Every package and price — the evergreen post." },
  { id: "flash_sale", label: "Flash sale", description: "Sale prices or a promo code, with an end time." },
  { id: "new_pass", label: "Weekly / monthly pass", description: "Remind players to renew their pass." },
  { id: "how_to_topup", label: "How to top up", description: "Step-by-step guide that builds trust." },
  { id: "giveaway", label: "Giveaway", description: "Platform-compliant giveaway with full rules." },
] as const;

export type CaptionTemplate = (typeof CAPTION_TEMPLATES)[number]["id"];

export function isCaptionTemplate(value: unknown): value is CaptionTemplate {
  return CAPTION_TEMPLATES.some((t) => t.id === value);
}

export type Lang = "en" | "km";
export type Localized = { en: string; km: string };

export type CaptionGame = {
  id?: number;
  slug: string;
  name: string;
  currencyName: string;
  idLabel?: string | null;
  requiresZone?: boolean | null;
  zoneLabel?: string | null;
  hashtags?: string | null;
};

export type CaptionPackage = PromoPackage;

export type CaptionCatalogItem = {
  slug: string;
  name: string;
  currencyName: string;
  minPriceCents: number | null;
};

export type CaptionInput = {
  template: CaptionTemplate;
  /** The game being promoted; null = all games (uses `catalog`). */
  game: CaptionGame | null;
  /** Active packages of `game`, in display order. */
  packages: CaptionPackage[];
  /** Orderable games with "from" prices, for all-games posts. */
  catalog?: CaptionCatalogItem[];
  storeName: string;
  siteUrl: string;
  /** Code advertised on both platforms (e.g. the follower code). */
  promoCode?: string | null;
  /** Per-platform codes (FB5 / TIKTOK5) — override promoCode so orders show which platform sold. */
  platformPromoCodes?: Partial<Record<"facebook" | "tiktok", string | null>>;
  /** Offer details by code, to describe "10% off (up to $2.00)". */
  promoOffers?: Record<string, PromoOffer>;
  /** Extra hashtags (settings.marketing.defaultHashtags). */
  hashtags?: string | null;
  /** End time, e.g. "Sunday 9 PM". Flash sale + giveaway. String = same text in both languages. */
  ends?: Localized | string | null;
  giveaway?: { prize?: string | null; winners?: number | null };
  /** TikTok @handle for "follow us" lines. */
  tiktokHandle?: string | null;
  /** Clock for defaults (giveaway end date). */
  now?: Date;
};

export type CaptionSet = {
  facebook: Localized;
  tiktok: Localized;
  videoScript: Localized;
  links: { facebook: string; tiktok: string };
  /** Honesty / quality notes for the admin (not part of the captions). */
  warnings: string[];
};

export const TIKTOK_CAPTION_LIMIT = 2200;
const MAX_LIST_ROWS = 12;
const MAX_HASHTAGS = 8;

// ───────────────────────────── small helpers ─────────────────────────────

const L = (en: string, km: string): Localized => ({ en, km });
const KM_DIGITS = "០១២៣៤៥៦៧៨៩";

/** 19 → "១៩" */
export function kmNumber(n: number | string): string {
  return String(n).replace(/\d/g, (d) => KM_DIGITS[Number(d)]!);
}

/** Players say ពេជ្រ for diamonds; other currency names (UC, CP, Tokens) stay as they are. */
function kmCurrency(name: string): string {
  return /^diamonds?$/i.test(name.trim()) ? "ពេជ្រ" : name;
}

/** "Mobile Legends: Bang Bang" → "Mobile Legends" (for compact lists). */
function shortName(name: string): string {
  return name.split(/[:|–-]\s/)[0]!.trim() || name;
}

const lines = (...xs: (string | false | null | undefined)[]) => xs.filter((x): x is string => !!x).join("\n");
const blocks = (...xs: (string | false | null | undefined)[]) =>
  xs.filter((x): x is string => !!x && x.trim() !== "").join("\n\n");

/**
 * Normalize, de-duplicate (case-insensitive) and merge hashtag strings:
 * "#MLBB mlbb, #Top-Up" → ["#MLBB", "#TopUp"]. Order is preserved.
 */
export function mergeHashtags(...sources: (string | null | undefined)[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    for (const raw of (source ?? "").split(/[\s,]+/)) {
      const tag = raw.replace(/^#+/, "").replace(/[^\p{L}\p{M}\p{N}_]/gu, "");
      if (!tag) continue;
      const key = tag.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(`#${tag}`);
    }
  }
  return out;
}

const CODE_RE = /^[A-Z0-9_-]{1,32}$/;
const normCode = (c: string | null | undefined) => {
  const v = (c ?? "").replace(/\s+/g, "").toUpperCase();
  return CODE_RE.test(v) ? v : null;
};

type ResolvedPromo = { code: string; offer: PromoOffer | null };

const BADGE_MARK: Record<string, string> = { hot: " 🔥", best: " ⭐", new: " 🆕", promo: " 🏷️", sale: " 🏷️" };
const badgeMark = (p: CaptionPackage) => BADGE_MARK[(p.badge ?? "").trim().toLowerCase()] ?? "";

function priceLine(p: CaptionPackage, lang: Lang, withSaving = false): string {
  const was = isOnSale(p) ? p.compareAtCents! : null;
  const pct = withSaving ? discountPercent(p) : null;
  let extra = "";
  if (was != null) {
    const save = pct ? (lang === "km" ? ` · សន្សំ ${pct}%` : ` · save ${pct}%`) : "";
    extra = lang === "km" ? ` (ធម្មតា ${formatUsd(was)}${save})` : ` (was ${formatUsd(was)}${save})`;
  }
  return `• ${p.name} — ${formatUsd(p.priceCents)}${extra}${badgeMark(p)}`;
}

const compact = (p: CaptionPackage) => `${p.name} ${formatUsd(p.priceCents)}`;

/** Next Sunday 8 PM Phnom Penh time at least 3 days away — a sane default giveaway end. */
export function defaultGiveawayEnd(now: Date = new Date()): Localized {
  const OFFSET = 7 * 3600_000;
  const local = new Date(now.getTime() + OFFSET);
  const end = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), 20, 0, 0));
  const daysToSunday = (7 - end.getUTCDay()) % 7;
  end.setUTCDate(end.getUTCDate() + daysToSunday);
  while (end.getTime() - local.getTime() < 3 * 24 * 3600_000) end.setUTCDate(end.getUTCDate() + 7);
  const day = end.getUTCDate();
  const month = end.getUTCMonth();
  const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const KM_MONTHS = ["មករា", "កុម្ភៈ", "មីនា", "មេសា", "ឧសភា", "មិថុនា", "កក្កដា", "សីហា", "កញ្ញា", "តុលា", "វិច្ឆិកា", "ធ្នូ"];
  return L(`Sunday ${day} ${EN_MONTHS[month]}, 8 PM`, `ថ្ងៃអាទិត្យ ទី${kmNumber(day)} ខែ${KM_MONTHS[month]} ម៉ោង ៨ យប់`);
}

function toLocalized(v: Localized | string | null | undefined): Localized | null {
  if (!v) return null;
  if (typeof v === "string") {
    const s = v.trim().slice(0, 80);
    return s ? L(s, s) : null;
  }
  const en = v.en.trim().slice(0, 80);
  const km = v.km.trim().slice(0, 80);
  return en || km ? L(en || km, km || en) : null;
}

/** Fit hashtags (dropped from the end first), then the body, into TikTok's limit. */
function fitTikTok(body: string, tags: string[], limit = TIKTOK_CAPTION_LIMIT): { text: string; trimmed: boolean } {
  const kept = [...tags];
  const join = () => (kept.length ? `${body}\n${kept.join(" ")}` : body);
  let text = join();
  let trimmed = false;
  while ([...text].length > limit && kept.length) {
    kept.pop();
    text = join();
    trimmed = true;
  }
  if ([...text].length > limit) {
    text = [...text].slice(0, limit - 1).join("") + "…";
    trimmed = true;
  }
  return { text, trimmed };
}

// ───────────────────────────── video scripts ─────────────────────────────

type Beat = {
  kind: "hook" | "scene" | "cta";
  /** Seconds [from, to]. */
  at: [number, number];
  shot: Localized;
  text?: Localized;
  vo?: Localized;
};

type ScriptSpec = { title: Localized; beats: Beat[]; tips?: Localized[] };

function renderScript(spec: ScriptSpec, lang: Lang, commonTips: Localized[]): string {
  const km = lang === "km";
  const total = spec.beats.at(-1)?.at[1] ?? 15;
  const num = (n: number) => (km ? kmNumber(n) : String(n));
  const head = km
    ? `🎬 ${spec.title.km} — វីដេអូបញ្ឈរ 9:16 · ប្រហែល ${kmNumber(total)} វិនាទី (TikTok / Reels)`
    : `🎬 ${spec.title.en} — vertical 9:16 · about ${total}s (TikTok / Reels)`;
  let scene = 0;
  const parts = spec.beats.map((b) => {
    const range = km ? `${num(b.at[0])}–${num(b.at[1])} វិនាទី` : `${b.at[0]}–${b.at[1]}s`;
    const label =
      b.kind === "hook" ? "HOOK" : b.kind === "cta" ? "CTA" : km ? `ឈុតទី${kmNumber(++scene)}` : `SCENE ${++scene}`;
    return lines(
      `${label} (${range})`,
      `${km ? "ការថត៖" : "Shot:"} ${b.shot[lang]}`,
      b.text && `${km ? "អក្សរលើអេក្រង់៖" : "On-screen text:"} “${b.text[lang]}”`,
      b.vo && `${km ? "សំឡេងនិយាយ៖" : "Voice-over:"} “${b.vo[lang]}”`,
    );
  });
  const tips = [...(spec.tips ?? []), ...commonTips].map((t) => `• ${t[lang]}`);
  return blocks(head, ...parts, lines(km ? "គន្លឹះ" : "Tips", ...tips));
}

// ───────────────────────────── generator ─────────────────────────────

type Ctx = {
  input: CaptionInput;
  game: CaptionGame | null;
  gameName: string;
  /** "Mobile Legends" for "Mobile Legends: Bang Bang" — TikTok captions and scripts stay short. */
  short: string;
  currency: Localized;
  idLabel: Localized;
  zoneLabel: string | null;
  packages: CaptionPackage[];
  min: number | null;
  fb: { link: string; promo: ResolvedPromo | null; tags: string[] };
  tt: { link: string; promo: ResolvedPromo | null; tags: string[] };
  store: string;
  warnings: string[];
};

const TEMPLATE_TAGS: Record<CaptionTemplate, string> = {
  price_list: "#PriceList",
  flash_sale: "#FlashSale",
  new_pass: "#WeeklyPass",
  how_to_topup: "#HowToTopUp",
  giveaway: "#Giveaway",
};

function resolvePromo(code: string | null | undefined, input: CaptionInput, warnings: string[]): ResolvedPromo | null {
  const c = normCode(code);
  if (!c) return null;
  const offer = input.promoOffers?.[c] ?? null;
  if (offer && !offerAppliesTo(offer, input.game?.id ?? null)) {
    const msg = `Code ${c} only works for one specific game, so it was left out of these captions.`;
    if (!warnings.includes(msg)) warnings.push(msg);
    return null;
  }
  return { code: c, offer };
}

function buildCtx(input: CaptionInput): Ctx {
  const warnings: string[] = [];
  const game = input.game;
  const site = input.siteUrl.replace(/\/+$/, "");
  const landing = game ? `${site}/games/${encodeURIComponent(game.slug)}` : `${site}/`;
  const campaign = game ? game.slug : input.template;
  const content = game ? input.template : ALL_GAMES_CAMPAIGN;

  const fbPromo = resolvePromo(input.platformPromoCodes?.facebook ?? input.promoCode, input, warnings);
  const ttPromo = resolvePromo(input.platformPromoCodes?.tiktok ?? input.promoCode, input, warnings);
  // ?promo= pre-fills the code on the game page; the home page has no form.
  const link = (source: "facebook" | "tiktok", promo: ResolvedPromo | null) => {
    const tagged = buildUtmLink(landing, { source, medium: "social", campaign, content });
    return game ? withPromoParam(tagged, promo?.code) : tagged;
  };

  const tags = mergeHashtags(game?.hashtags, TEMPLATE_TAGS[input.template], input.hashtags).slice(0, MAX_HASHTAGS);
  const packages = game ? (input.packages ?? []).filter((p) => p.priceCents > 0) : [];
  if (game && packages.length === 0) warnings.push(`${game.name} has no active packages — add prices before posting.`);
  const idLabel = game?.idLabel?.trim() || "";

  return {
    input,
    game,
    gameName: game?.name ?? input.storeName,
    short: game ? shortName(game.name) : input.storeName,
    currency: L(game?.currencyName ?? "", kmCurrency(game?.currencyName ?? "")),
    idLabel: idLabel ? L(idLabel, idLabel) : L("game ID", "ID ហ្គេម"),
    zoneLabel: game?.requiresZone ? game.zoneLabel?.trim() || "Zone ID" : null,
    packages,
    min: game ? minPrice(packages) : minPrice((input.catalog ?? []).map((g) => ({ name: g.name, priceCents: g.minPriceCents ?? 0 }))),
    fb: { link: link("facebook", fbPromo), promo: fbPromo, tags },
    tt: { link: link("tiktok", ttPromo), promo: ttPromo, tags },
    store: input.storeName,
    warnings,
  };
}

/** "🎁 Use code FB5 — 5% off (up to $2.00)" in both languages; null without a code. */
function promoLine(promo: ResolvedPromo | null, auto: boolean): Localized | null {
  if (!promo) return null;
  const en = promo.offer ? `🎁 Use code ${promo.code} — ${describeOffer(promo.offer, "en")}` : `🎁 Use code ${promo.code} for an extra discount`;
  const km = promo.offer
    ? `🎁 ប្រើកូដ ${promo.code} — ${describeOffer(promo.offer, "km")}`
    : `🎁 ប្រើកូដ ${promo.code} ដើម្បីទទួលបានការបញ្ចុះតម្លៃបន្ថែម`;
  return auto ? L(`${en} (applied automatically from the link)`, `${km} (កូដដាក់ឱ្យស្វ័យប្រវត្តិពេលចុចលីង)`) : L(en, km);
}

function trust(ctx: Ctx, which: ("khqr" | "fast" | "password")[]): Localized {
  const id = ctx.idLabel;
  const all = {
    khqr: L("✅ Pay with KHQR — ABA, ACLEDA, Wing & any Bakong app", "✅ បង់ប្រាក់ដោយ KHQR — ABA, ACLEDA, Wing និងកម្មវិធី Bakong ទាំងអស់"),
    fast: L(`✅ Delivered to your ${id.en} in minutes`, `✅ បញ្ចូលទៅ ${id.km} របស់អ្នកក្នុងរយៈពេលប៉ុន្មាននាទី`),
    password: L(
      `✅ We only need your ${id.en} — never your password`,
      `✅ ត្រូវការតែ ${id.km} ប៉ុណ្ណោះ — មិនដែលសុំលេខសម្ងាត់ទេ`,
    ),
  };
  return L(lines(...which.map((k) => all[k].en)), lines(...which.map((k) => all[k].km)));
}

const tagLine = (tags: string[]) => tags.join(" ");

type Built = { fb: Localized; tt: Localized; script: ScriptSpec };

function ctaLine(link: string, en: string, km: string): Localized {
  return L(`👉 ${en}: ${link}`, `👉 ${km}៖ ${link}`);
}

function bioLine(link: string): Localized {
  return L(`🔗 Link in bio: ${link}`, `🔗 លីងនៅក្នុង Bio៖ ${link}`);
}

function codeCta(promo: ResolvedPromo | null): { text: Localized; vo: Localized } {
  return promo
    ? {
        text: L(`Link in bio 🔗 Code ${promo.code}`, `លីងក្នុង Bio 🔗 កូដ ${promo.code}`),
        vo: L(`Link in bio — use code ${promo.code} for extra off.`, `លីងនៅក្នុង Bio — ប្រើកូដ ${promo.code} បញ្ចុះថែមទៀត។`),
      }
    : {
        text: L("Link in bio 🔗", "លីងក្នុង Bio 🔗"),
        vo: L("Link in bio — top up now.", "លីងនៅក្នុង Bio — Top Up ឥឡូវនេះ។"),
      };
}

// ── price list ──

function priceList(ctx: Ctx): Built {
  const { game, fb, tt, store } = ctx;
  const cur = ctx.currency;
  const min = ctx.min != null ? formatUsd(ctx.min) : null;

  if (!game) {
    const catalog = (ctx.input.catalog ?? []).filter((g) => g.minPriceCents != null);
    const rows = (lang: Lang) =>
      lines(
        ...catalog
          .slice(0, MAX_LIST_ROWS)
          .map((g) => `• ${g.name} — ${lang === "km" ? "ចាប់ពី" : "from"} ${formatUsd(g.minPriceCents!)}`),
      );
    const names = catalog.slice(0, 4).map((g) => shortName(g.name)).join(", ");
    const fbPromo = promoLine(fb.promo, false);
    const ttPromo = tt.promo ? L(`🎁 Code ${tt.promo.code}`, `🎁 កូដ ${tt.promo.code}`) : null;
    const tr = trust(ctx, ["khqr", "password"]);
    const cta = ctaLine(fb.link, "Pick your game", "ជ្រើសរើសហ្គេមរបស់អ្នក");
    const top3 = catalog
      .slice(0, 3)
      .map((g) => `${shortName(g.name)} ${formatUsd(g.minPriceCents!)}`)
      .join(" · ");
    return {
      fb: L(
        blocks(
          `🎮 ${store} — game top-up price list 🇰🇭`,
          rows("en"),
          tr.en,
          lines(fbPromo?.en, cta.en),
          tagLine(fb.tags),
        ),
        blocks(
          `🎮 ${store} — តារាងតម្លៃ Top Up ហ្គេម 🇰🇭`,
          rows("km"),
          tr.km,
          lines(fbPromo?.km, cta.km),
          tagLine(fb.tags),
        ),
      ),
      tt: L(
        lines(
          `Top up ${names}${catalog.length > 4 ? "…" : ""}${min ? ` from ${min}` : ""} 🎮 Pay with KHQR ⚡`,
          ttPromo?.en,
          bioLine(tt.link).en,
        ),
        lines(
          `Top Up ${names}${catalog.length > 4 ? "…" : ""}${min ? ` ចាប់ពី ${min}` : ""} 🎮 បង់ប្រាក់ដោយ KHQR ⚡`,
          ttPromo?.km,
          bioLine(tt.link).km,
        ),
      ),
      script: {
        title: L(`${store} price list`, `តារាងតម្លៃ ${store}`),
        beats: [
          {
            kind: "hook",
            at: [0, 3],
            shot: L(
              "Fast swipe through the game tiles on the all-games story image.",
              "អូសរូបហ្គេមនៅលើរូប Story តម្លៃហ្គេមទាំងអស់យ៉ាងលឿន។",
            ),
            text: L("Which game do you top up? 🎮", "អ្នក Top Up ហ្គេមអ្វី? 🎮"),
            vo: L("Which game do you play? We top up all of these.", "អ្នកលេងហ្គេមអ្វី? យើង Top Up បានទាំងអស់នេះ។"),
          },
          {
            kind: "scene",
            at: [3, 9],
            shot: L("Point at 3 games one by one with their 'from' price.", "ចង្អុលទៅហ្គេម ៣ ម្តងមួយៗ ជាមួយតម្លៃចាប់ផ្តើម។"),
            text: L(top3, top3),
            vo: L(min ? `Prices start at just ${min}.` : "Cheap prices for every game.", min ? `តម្លៃចាប់ពីត្រឹមតែ ${min}។` : "តម្លៃថោកសម្រាប់គ្រប់ហ្គេម។"),
          },
          {
            kind: "scene",
            at: [9, 15],
            shot: L(
              "Screen-record an order: pick a game → enter ID (blurred) → KHQR → scan with your bank app.",
              "ថតអេក្រង់ពេលកុម្ម៉ង់៖ ជ្រើសហ្គេម → បញ្ចូល ID (blur) → KHQR → ស្កេនដោយកម្មវិធីធនាគារ។",
            ),
            text: L("Pay with KHQR ✅ ABA · ACLEDA · Wing", "បង់ប្រាក់ដោយ KHQR ✅ ABA · ACLEDA · Wing"),
            vo: L("Enter your ID, scan the KHQR, done.", "បញ្ចូល ID ស្កេន KHQR រួចរាល់។"),
          },
          {
            kind: "cta",
            at: [15, 20],
            shot: L(`Back to camera or the ${store} logo; point to the bio link.`, `ត្រឡប់មកកាមេរ៉ា ឬឡូហ្គោ ${store} ហើយចង្អុលទៅលីងក្នុង Bio។`),
            ...codeCta(tt.promo),
          },
        ],
      },
    };
  }

  const list = pickListPackages(ctx.packages, MAX_LIST_ROWS);
  const more = ctx.packages.length - list.length;
  const top = pickHighlightPackages(ctx.packages, 3);
  const fbPromo = promoLine(fb.promo, true);
  const ttPromo = tt.promo ? L(`🎁 Code ${tt.promo.code}`, `🎁 កូដ ${tt.promo.code}`) : null;
  const tr = trust(ctx, ["khqr", "fast", "password"]);
  const cta = ctaLine(fb.link, "Order here", "កុម្ម៉ង់នៅទីនេះ");
  const name = game.name;
  return {
    fb: L(
      blocks(
        `💎 ${name} — ${cur.en} price list`,
        `Top up ${name} at ${store}: cheap, fast and safe 🇰🇭`,
        lines("📋 Prices", ...list.map((p) => priceLine(p, "en")), more > 0 && `…and ${more} more on our website`),
        tr.en,
        lines(fbPromo?.en, cta.en),
        tagLine(fb.tags),
      ),
      blocks(
        `💎 តារាងតម្លៃ ${cur.km} ${name}`,
        `Top Up ${name} នៅ ${store}៖ ថោក លឿន និងមានសុវត្ថិភាព 🇰🇭`,
        lines("📋 តម្លៃ", ...list.map((p) => priceLine(p, "km")), more > 0 && `…និង ${kmNumber(more)} កញ្ចប់ទៀតនៅលើវេបសាយ`),
        tr.km,
        lines(fbPromo?.km, cta.km),
        tagLine(fb.tags),
      ),
    ),
    tt: L(
      lines(
        `${ctx.short} ${cur.en}${min ? ` from ${min}` : ""} 💎 Pay with KHQR, delivered in minutes ⚡`,
        top.length > 0 && top.map(compact).join(" · "),
        ttPromo?.en,
        bioLine(tt.link).en,
      ),
      lines(
        `${cur.km} ${ctx.short}${min ? ` ចាប់ពី ${min}` : ""} 💎 បង់ប្រាក់ដោយ KHQR បញ្ចូលរួចក្នុងប៉ុន្មាននាទី ⚡`,
        top.length > 0 && top.map(compact).join(" · "),
        ttPromo?.km,
        bioLine(tt.link).km,
      ),
    ),
    script: {
      title: L(`${name} price list`, `តារាងតម្លៃ ${name}`),
      beats: [
        {
          kind: "hook",
          at: [0, 3],
          shot: L(
            `Close-up of your phone showing the ${name} story image; quick zoom on the cheapest price.`,
            `ថតជិតទូរស័ព្ទដែលបង្ហាញរូប Story ${name} រួចពង្រីក (zoom) ទៅតម្លៃថោកបំផុត។`,
          ),
          text: L(`${cur.en}${min ? ` from ${min}` : ""}?! 😳`, `${cur.km}${min ? ` ចាប់ពី ${min}` : ""}?! 😳`),
          vo: L(`Still paying too much for ${ctx.short} ${cur.en}?`, `នៅតែទិញ ${cur.km} ${ctx.short} ថ្លៃមែនទេ?`),
        },
        {
          kind: "scene",
          at: [3, 8],
          shot: L("Tap through the best deals on the image, one tap per price.", "ចុចបង្ហាញកញ្ចប់ល្អៗម្តងមួយៗ។"),
          text: L(top.map(compact).join(" · "), top.map(compact).join(" · ")),
          vo: top[0]
            ? L(`${top[0].name} is only ${formatUsd(top[0].priceCents)}.`, `${top[0].name} ត្រឹមតែ ${formatUsd(top[0].priceCents)} ប៉ុណ្ណោះ។`)
            : undefined,
        },
        {
          kind: "scene",
          at: [8, 14],
          shot: L(
            `Screen-record an order: enter the ${ctx.idLabel.en} (blurred) → pick a package → KHQR → scan with your bank app.`,
            `ថតអេក្រង់ពេលកុម្ម៉ង់៖ បញ្ចូល ${ctx.idLabel.km} (blur) → ជ្រើសកញ្ចប់ → KHQR → ស្កេនដោយកម្មវិធីធនាគារ។`,
          ),
          text: L("Pay with KHQR ✅ ABA · ACLEDA · Wing", "បង់ប្រាក់ដោយ KHQR ✅ ABA · ACLEDA · Wing"),
          vo: L("Enter your ID, scan the KHQR, done in a minute.", "បញ្ចូល ID ស្កេន KHQR រួចរាល់ក្នុងមួយនាទី។"),
        },
        {
          kind: "cta",
          at: [14, 20],
          shot: L(`Back to camera or the ${store} logo; point to the bio link.`, `ត្រឡប់មកកាមេរ៉ា ឬឡូហ្គោ ${store} ហើយចង្អុលទៅលីងក្នុង Bio។`),
          ...codeCta(tt.promo),
        },
      ],
    },
  };
}

// ── flash sale ──

function flashSale(ctx: Ctx): Built {
  const { game, fb, tt, store, input } = ctx;
  const ends = toLocalized(input.ends);
  const endsLine = ends ? L(`⏰ Ends ${ends.en}`, `⏰ ផុតកំណត់៖ ${ends.km}`) : L("⏰ Limited time only", "⏰ សម្រាប់រយៈពេលខ្លីប៉ុណ្ណោះ");
  const sale = ctx.packages
    .filter(isOnSale)
    .sort((a, b) => (discountPercent(b) ?? 0) - (discountPercent(a) ?? 0))
    .slice(0, 5);
  const onSale = sale.length > 0;
  if (!onSale && !fb.promo && !tt.promo) {
    ctx.warnings.push(
      "Nothing is actually discounted: set a compare-at (“was”) price on some packages or pick a promo code, so the flash sale is real.",
    );
  }
  const deals = onSale ? sale : pickHighlightPackages(ctx.packages, 4);
  const title = game ? `${game.name} ${ctx.currency.en}` : store;
  const titleKm = game ? `${ctx.currency.km} ${game.name}` : store;
  const fbCode = fb.promo
    ? L(
        `🎁 ${onSale ? "Stack it with code" : "Flash code:"} ${fb.promo.code}${fb.promo.offer ? ` — ${describeOffer(fb.promo.offer, "en")}` : ""}`,
        `🎁 ${onSale ? `បញ្ចុះថែមទៀតជាមួយកូដ ${fb.promo.code}` : `កូដ Flash Sale៖ ${fb.promo.code}`}${fb.promo.offer ? ` — ${describeOffer(fb.promo.offer, "km")}` : ""}`,
      )
    : null;
  const catalogRows = (lang: Lang) =>
    (input.catalog ?? [])
      .filter((g) => g.minPriceCents != null)
      .slice(0, 8)
      .map((g) => `• ${g.name} — ${lang === "km" ? "ចាប់ពី" : "from"} ${formatUsd(g.minPriceCents!)}`);
  const rows = (lang: Lang) => (game ? deals.map((p) => priceLine(p, lang, true)) : catalogRows(lang));
  const tr = trust(ctx, ["khqr", "password"]);
  const cta = ctaLine(fb.link, "Grab it before it ends", "ប្រញាប់កុម្ម៉ង់មុនផុតកំណត់");
  const best = deals[0];
  const bestText = (lang: Lang) =>
    best
      ? `${best.name} ${formatUsd(best.priceCents)}${isOnSale(best) ? (lang === "km" ? ` (ធម្មតា ${formatUsd(best.compareAtCents!)})` : ` (was ${formatUsd(best.compareAtCents!)})`) : ""}`
      : lang === "km"
        ? "តម្លៃពិសេសគ្រប់ហ្គេម"
        : "deals on every game";

  return {
    fb: L(
      blocks(
        lines(`⚡ FLASH SALE — ${title}`, endsLine.en),
        lines(game ? (onSale ? "🔥 Sale prices" : "🔥 Top picks") : "🔥 Every game", ...rows("en")),
        lines(fbCode?.en, cta.en),
        tr.en,
        tagLine(fb.tags),
      ),
      blocks(
        lines(`⚡ FLASH SALE — ${titleKm}`, endsLine.km),
        lines(game ? (onSale ? "🔥 តម្លៃពិសេស" : "🔥 កញ្ចប់ពេញនិយម") : "🔥 គ្រប់ហ្គេម", ...rows("km")),
        lines(fbCode?.km, cta.km),
        tr.km,
        tagLine(fb.tags),
      ),
    ),
    tt: L(
      lines(
        `⚡ FLASH SALE ${ctx.short}: ${bestText("en")}${ends ? ` · ends ${ends.en}` : ""}`,
        tt.promo && `🎁 Extra off with code ${tt.promo.code}`,
        bioLine(tt.link).en,
      ),
      lines(
        `⚡ FLASH SALE ${ctx.short}៖ ${bestText("km")}${ends ? ` · ផុតកំណត់ ${ends.km}` : ""}`,
        tt.promo && `🎁 បញ្ចុះថែមជាមួយកូដ ${tt.promo.code}`,
        bioLine(tt.link).km,
      ),
    ),
    script: {
      title: L(`Flash sale — ${title}`, `Flash Sale — ${titleKm}`),
      beats: [
        {
          kind: "hook",
          at: [0, 3],
          shot: L(
            "Big “⚡ FLASH SALE” text over a fast zoom on the game image; add a countdown sticker.",
            "អក្សរធំ «⚡ FLASH SALE» លើរូបហ្គេម ពង្រីកលឿនៗ ហើយដាក់ sticker រាប់ថយក្រោយ (countdown)។",
          ),
          text: L(`⚡ FLASH SALE ${game ? ctx.short : ""}`.trim(), `⚡ FLASH SALE ${game ? ctx.short : ""}`.trim()),
          vo: L(`Flash sale on ${title} — don't miss this!`, `Flash Sale ${titleKm} — កុំឱ្យខកខាន!`),
        },
        {
          kind: "scene",
          at: [3, 8],
          shot: onSale
            ? L("Show the old price, cross it out on screen, then reveal the sale price.", "បង្ហាញតម្លៃចាស់ គូសឆូតវា រួចបង្ហាញតម្លៃពិសេស។")
            : L("Show the best package and its price on the story image.", "បង្ហាញកញ្ចប់ពេញនិយម និងតម្លៃរបស់វានៅលើរូប Story។"),
          text: L(bestText("en"), bestText("km")),
          vo:
            best && onSale
              ? L(
                  `${best.name}: was ${formatUsd(best.compareAtCents!)}, now just ${formatUsd(best.priceCents)}.`,
                  `${best.name}៖ ធម្មតា ${formatUsd(best.compareAtCents!)} ឥឡូវត្រឹមតែ ${formatUsd(best.priceCents)}។`,
                )
              : L("Our most popular packs, even cheaper today.", "កញ្ចប់ពេញនិយមរបស់យើង ថោកជាងមុនថ្ងៃនេះ។"),
        },
        tt.promo
          ? {
              kind: "scene",
              at: [8, 12],
              shot: L("Screen-record the code being applied at checkout (blur the Player ID).", "ថតអេក្រង់ពេលដាក់កូដនៅពេលកុម្ម៉ង់ (blur Player ID)។"),
              text: L(`Code ${tt.promo.code} = extra off 🎁`, `កូដ ${tt.promo.code} = បញ្ចុះថែម 🎁`),
              vo: L(`Add code ${tt.promo.code} to save even more.`, `ដាក់កូដ ${tt.promo.code} ដើម្បីសន្សំបន្ថែមទៀត។`),
            }
          : {
              kind: "scene",
              at: [8, 12],
              shot: L("Screen-record the KHQR payment with your bank app (blur the Player ID).", "ថតអេក្រង់ពេលបង់ប្រាក់តាម KHQR ជាមួយកម្មវិធីធនាគារ (blur Player ID)។"),
              text: L("Pay with KHQR ✅", "បង់ប្រាក់ដោយ KHQR ✅"),
              vo: L("Scan with ABA, ACLEDA or Wing — done.", "ស្កេនជាមួយ ABA, ACLEDA ឬ Wing — រួចរាល់។"),
            },
        {
          kind: "cta",
          at: [12, 15],
          shot: L("Countdown sticker close-up, then point to the bio link.", "បង្ហាញ sticker countdown ជិតៗ រួចចង្អុលទៅលីងក្នុង Bio។"),
          text: ends
            ? L(`Ends ${ends.en} ⏰ Link in bio`, `ផុតកំណត់ ${ends.km} ⏰ លីងក្នុង Bio`)
            : L("Limited time ⏰ Link in bio", "រយៈពេលកំណត់ ⏰ លីងក្នុង Bio"),
          vo: ends
            ? L(`Ends ${ends.en} — link in bio!`, `ផុតកំណត់ ${ends.km} — លីងនៅក្នុង Bio!`)
            : L("Limited time — link in bio!", "រយៈពេលកំណត់ — លីងនៅក្នុង Bio!"),
        },
      ],
      tips: [
        L(
          "Only call it a sale when prices are really lower — keep the old price honest.",
          "ហៅថាបញ្ចុះតម្លៃ តែពេលតម្លៃពិតជាថោកជាងមុនប៉ុណ្ណោះ — តម្លៃចាស់ត្រូវតែពិត។",
        ),
      ],
    },
  };
}

// ── weekly / monthly pass ──

function newPass(ctx: Ctx): Built {
  const { game, fb, tt, store } = ctx;
  const passes = ctx.packages.filter(isPassPackage).slice(0, 6);
  const hasPass = passes.length > 0;
  if (game && !hasPass) {
    ctx.warnings.push(`${game.name} has no pass or membership package — the post lists small packs instead.`);
  }
  const list = hasPass ? passes : [...ctx.packages].sort((a, b) => a.priceCents - b.priceCents).slice(0, 3);
  const name = game?.name ?? store;
  const lead = list[0];
  const fbPromo = promoLine(fb.promo, !!game);
  const id = ctx.idLabel;
  const catalogNames = (ctx.input.catalog ?? []).slice(0, 5).map((g) => shortName(g.name)).join(", ");
  const cta = game
    ? ctaLine(fb.link, hasPass ? "Get your pass" : "Top up now", hasPass ? "ទិញ Pass នៅទីនេះ" : "Top Up ឥឡូវនេះ")
    : ctaLine(fb.link, "Pick your game", "ជ្រើសរើសហ្គេមរបស់អ្នក");

  const howEn = hasPass
    ? `Renew in under a minute: enter your ${id.en}, pick your pass, scan the KHQR. No password, no waiting for a reply.`
    : `Top up in under a minute: enter your ${id.en}, pick a pack, scan the KHQR. No password, no waiting for a reply.`;
  const howKm = hasPass
    ? `បន្ត Pass ក្នុងរយៈពេលមិនដល់មួយនាទី៖ បញ្ចូល ${id.km} ជ្រើសរើស Pass ហើយស្កេន KHQR។ មិនត្រូវការលេខសម្ងាត់ មិនបាច់ចាំឆ្លើយសារ។`
    : `Top Up ក្នុងរយៈពេលមិនដល់មួយនាទី៖ បញ្ចូល ${id.km} ជ្រើសរើសកញ្ចប់ ហើយស្កេន KHQR។ មិនត្រូវការលេខសម្ងាត់ មិនបាច់ចាំឆ្លើយសារ។`;

  const fbEn = game
    ? blocks(
        hasPass ? `🗓️ New week, new pass! — ${name}` : `🗓️ Small packs for daily play — ${name}`,
        lines(...list.map((p) => priceLine(p, "en"))),
        howEn,
        lines(fbPromo?.en, cta.en),
        tagLine(fb.tags),
      )
    : blocks(
        "🗓️ New week, new pass!",
        `Weekly passes, memberships and monthly cards for ${catalogNames} — renew in under a minute with KHQR at ${store}. No password, no waiting for a reply.`,
        lines(fbPromo?.en, cta.en),
        tagLine(fb.tags),
      );
  const fbKm = game
    ? blocks(
        hasPass ? `🗓️ សប្តាហ៍ថ្មី Pass ថ្មី! — ${name}` : `🗓️ កញ្ចប់តូចៗសម្រាប់លេងរាល់ថ្ងៃ — ${name}`,
        lines(...list.map((p) => priceLine(p, "km"))),
        howKm,
        lines(fbPromo?.km, cta.km),
        tagLine(fb.tags),
      )
    : blocks(
        "🗓️ សប្តាហ៍ថ្មី Pass ថ្មី!",
        `Weekly Pass, Membership និងកាតប្រចាំខែ សម្រាប់ ${catalogNames} — បន្តក្នុងរយៈពេលមិនដល់មួយនាទីតាម KHQR នៅ ${store}។ មិនត្រូវការលេខសម្ងាត់ មិនបាច់ចាំឆ្លើយសារ។`,
        lines(fbPromo?.km, cta.km),
        tagLine(fb.tags),
      );

  const leadText = lead ? `${lead.name} ${formatUsd(lead.priceCents)}` : name;
  return {
    fb: L(fbEn, fbKm),
    tt: L(
      lines(
        lead && game
          ? `${lead.name} only ${formatUsd(lead.priceCents)} ✅ Renew your ${ctx.short} ${hasPass ? "pass" : "top-up"} in 1 minute with KHQR ⚡`
          : `Renew your weekly pass in 1 minute with KHQR ✅ ${catalogNames} ⚡`,
        tt.promo && `🎁 Code ${tt.promo.code}`,
        bioLine(tt.link).en,
      ),
      lines(
        lead && game
          ? `${lead.name} ត្រឹមតែ ${formatUsd(lead.priceCents)} ✅ បន្ត${hasPass ? " Pass" : "ការ Top Up"} ${ctx.short} ក្នុង ១ នាទីតាម KHQR ⚡`
          : `បន្ត Weekly Pass ក្នុង ១ នាទីតាម KHQR ✅ ${catalogNames} ⚡`,
        tt.promo && `🎁 កូដ ${tt.promo.code}`,
        bioLine(tt.link).km,
      ),
    ),
    script: {
      title: L(`Renew your pass — ${name}`, `បន្ត Pass — ${name}`),
      beats: [
        {
          kind: "hook",
          at: [0, 3],
          shot: L(
            "POV: Monday morning, your pass just expired 😱 — react to the in-game pass screen.",
            "POV៖ ព្រឹកថ្ងៃចន្ទ Pass របស់អ្នកទើបតែផុតកំណត់ 😱 — បង្ហាញអេក្រង់ Pass ក្នុងហ្គេម។",
          ),
          text: L("Pass expired? 😱", "Pass ផុតកំណត់ហើយ? 😱"),
          vo: L(
            lead && hasPass ? `Your ${lead.name} ran out again?` : "Out of diamonds again?",
            lead && hasPass ? `${lead.name} របស់អ្នកអស់ទៀតហើយ?` : "អស់ពេជ្រទៀតហើយ?",
          ),
        },
        {
          kind: "scene",
          at: [3, 8],
          shot: L(
            `Open the website from the bio link and pick ${lead ? lead.name : "your pass"} — show how fast it is.`,
            `បើកវេបសាយពីលីងក្នុង Bio ហើយជ្រើសរើស ${lead ? lead.name : "Pass"} — បង្ហាញថាវាលឿនប៉ុណ្ណា។`,
          ),
          text: L(leadText, leadText),
          vo: lead
            ? L(`Renew it here for ${formatUsd(lead.priceCents)}.`, `បន្តនៅទីនេះត្រឹម ${formatUsd(lead.priceCents)}។`)
            : L("Renew it here in a minute.", "បន្តនៅទីនេះក្នុងមួយនាទី។"),
        },
        {
          kind: "scene",
          at: [8, 13],
          shot: L(
            "Scan the KHQR, then show the pass active in-game (blur the ID).",
            "ស្កេន KHQR រួចបង្ហាញ Pass ដំណើរការក្នុងហ្គេម (blur ID)។",
          ),
          text: L("Paid with KHQR → pass active ✅", "បង់តាម KHQR → Pass ដំណើរការ ✅"),
          vo: L("Scan, pay, done — under a minute.", "ស្កេន បង់ រួចរាល់ — មិនដល់មួយនាទី។"),
        },
        {
          kind: "cta",
          at: [13, 16],
          shot: L("Back to camera; point to the bio link.", "ត្រឡប់មកកាមេរ៉ា ហើយចង្អុលទៅលីងក្នុង Bio។"),
          text: codeCta(tt.promo).text,
          vo: L("Renew every week in one minute — link in bio.", "បន្តរៀងរាល់សប្តាហ៍ក្នុងមួយនាទី — លីងនៅក្នុង Bio។"),
        },
      ],
      tips: [L("Post this every Monday morning — that is when weekly passes run out.", "បង្ហោះវីដេអូនេះរៀងរាល់ព្រឹកថ្ងៃចន្ទ — ពេល Weekly Pass ផុតកំណត់។")],
    },
  };
}

// ── how to top up ──

function howToTopUp(ctx: Ctx): Built {
  const { game, fb, tt, store } = ctx;
  const id = ctx.idLabel;
  const zone = ctx.zoneLabel;
  const min = ctx.min != null ? formatUsd(ctx.min) : null;
  const name = game?.name;
  const fbPromo = promoLine(fb.promo, !!game);

  const fbEn = blocks(
    name ? `❓ How to top up ${name} at ${store} — takes 1 minute` : `❓ How to top up at ${store} — takes 1 minute`,
    lines(
      `1️⃣ Open ${fb.link}`,
      name
        ? `2️⃣ Enter your ${id.en}${zone ? ` and ${zone}` : ""} (you'll find it in your in-game profile)`
        : "2️⃣ Pick your game and enter your game ID (you'll find it in your in-game profile)",
      `3️⃣ Choose a package${min ? ` — from ${min}` : ""}`,
      "4️⃣ Tap “Pay with KHQR” and scan with ABA, ACLEDA, Wing or any Bakong app",
      `5️⃣ Done! Your ${name ? ctx.currency.en : "top-up"} arrives in minutes — track your order anytime on our website`,
    ),
    "🔒 We never ask for your password. If someone messages you first asking for it, it isn't us.",
    fbPromo?.en,
    tagLine(fb.tags),
  );
  const fbKm = blocks(
    name ? `❓ របៀប Top Up ${name} នៅ ${store} — ចំណាយពេលតែ ១ នាទី` : `❓ របៀប Top Up នៅ ${store} — ចំណាយពេលតែ ១ នាទី`,
    lines(
      `១. បើក ${fb.link}`,
      name
        ? `២. បញ្ចូល ${id.km}${zone ? ` និង ${zone}` : ""} (មើលបាននៅក្នុង Profile ក្នុងហ្គេម)`
        : "២. ជ្រើសរើសហ្គេម ហើយបញ្ចូល ID ហ្គេមរបស់អ្នក (មើលបាននៅក្នុង Profile ក្នុងហ្គេម)",
      `៣. ជ្រើសរើសកញ្ចប់${min ? ` — ចាប់ពី ${min}` : ""}`,
      "៤. ចុច «បង់ប្រាក់ដោយ KHQR» ហើយស្កេនដោយ ABA, ACLEDA, Wing ឬកម្មវិធី Bakong ណាមួយ",
      `៥. រួចរាល់! ${name ? ctx.currency.km : "ការ Top Up"} នឹងចូលក្នុងរយៈពេលប៉ុន្មាននាទី — អាចតាមដានការកុម្ម៉ង់បានគ្រប់ពេលនៅលើវេបសាយ`,
    ),
    "🔒 យើងមិនដែលសុំលេខសម្ងាត់របស់អ្នកទេ។ បើមាននរណាម្នាក់ផ្ញើសារមកមុន ហើយសុំលេខសម្ងាត់ នោះមិនមែនជាយើងទេ។",
    fbPromo?.km,
    tagLine(fb.tags),
  );

  const promo = tt.promo;
  return {
    fb: L(fbEn, fbKm),
    tt: L(
      lines(
        `How to top up ${game ? ctx.short : "any game"} in 1 minute ⏱️ Enter your ${id.en} → pick a package → scan KHQR ✅ No password needed 🔒`,
        promo && `🎁 Code ${promo.code}`,
        bioLine(tt.link).en,
      ),
      lines(
        `របៀប Top Up ${game ? ctx.short : "ហ្គេម"} ក្នុង ១ នាទី ⏱️ បញ្ចូល ${id.km} → ជ្រើសកញ្ចប់ → ស្កេន KHQR ✅ មិនត្រូវការលេខសម្ងាត់ 🔒`,
        promo && `🎁 កូដ ${promo.code}`,
        bioLine(tt.link).km,
      ),
    ),
    script: {
      title: L(`How to top up ${name ?? "at " + store}`, `របៀប Top Up ${name ?? "នៅ " + store}`),
      beats: [
        {
          kind: "hook",
          at: [0, 3],
          shot: L("Start a visible 60-second timer on screen.", "បង្ហាញម៉ោងរាប់ ៦០ វិនាទីនៅលើអេក្រង់។"),
          text: L(`Top up ${name ?? "your game"} in 60 seconds ⏱️`, `Top Up ${name ?? "ហ្គេម"} ក្នុង ៦០ វិនាទី ⏱️`),
          vo: L(
            `Here's how to top up ${name ?? "your game"} in under a minute — no password needed.`,
            `នេះជារបៀប Top Up ${name ?? "ហ្គេម"} ក្នុងរយៈពេលមិនដល់មួយនាទី — មិនត្រូវការលេខសម្ងាត់។`,
          ),
        },
        {
          kind: "scene",
          at: [3, 10],
          shot: L(
            `Screen-record: open the site from the bio link${name ? "" : ", choose a game"} and type the ${id.en} (blur it).`,
            `ថតអេក្រង់៖ បើកវេបសាយពីលីងក្នុង Bio${name ? "" : " ជ្រើសរើសហ្គេម"} ហើយវាយ ${id.km} (blur វា)។`,
          ),
          text: L(`1. Enter your ${id.en}`, `១. បញ្ចូល ${id.km}`),
          vo: L(`Open the link in our bio and enter your ${id.en}.`, `បើកលីងក្នុង Bio ហើយបញ្ចូល ${id.km}។`),
        },
        {
          kind: "scene",
          at: [10, 16],
          shot: L("Pick a package; show the price and the promo code field.", "ជ្រើសរើសកញ្ចប់ បង្ហាញតម្លៃ និងកន្លែងដាក់កូដ។"),
          text: L("2. Pick a package", "២. ជ្រើសរើសកញ្ចប់"),
          vo: L(
            `Pick your package${promo ? ` and add code ${promo.code}` : ""}.`,
            `ជ្រើសរើសកញ្ចប់${promo ? ` ហើយដាក់កូដ ${promo.code}` : ""}។`,
          ),
        },
        {
          kind: "scene",
          at: [16, 24],
          shot: L(
            "Tap “Pay with KHQR”, scan with your bank app, show the paid screen.",
            "ចុច «បង់ប្រាក់ដោយ KHQR» ស្កេនជាមួយកម្មវិធីធនាគារ ហើយបង្ហាញអេក្រង់បង់រួច។",
          ),
          text: L("3. Scan KHQR ✅", "៣. ស្កេន KHQR ✅"),
          vo: L("Tap Pay with KHQR and scan it with ABA, ACLEDA or Wing.", "ចុចបង់ប្រាក់ដោយ KHQR ហើយស្កេនជាមួយ ABA, ACLEDA ឬ Wing។"),
        },
        {
          kind: "cta",
          at: [24, 30],
          shot: L("Show the in-game balance going up (blur the ID) and stop the timer.", "បង្ហាញសមតុល្យក្នុងហ្គេមកើនឡើង (blur ID) ហើយបញ្ឈប់ម៉ោង។"),
          text: L("Done ✅ Link in bio 🔗", "រួចរាល់ ✅ លីងក្នុង Bio 🔗"),
          vo: L("Done! Link in bio.", "រួចរាល់! លីងនៅក្នុង Bio។"),
        },
      ],
    },
  };
}

// ── giveaway ──

function giveaway(ctx: Ctx): Built {
  const { game, fb, tt, store, input } = ctx;
  const winners = Math.min(50, Math.max(1, Math.round(input.giveaway?.winners ?? 3)));
  const customPrize = input.giveaway?.prize?.trim().slice(0, 80);
  const prizePkg = game ? pickHighlightPackages(ctx.packages, 1)[0] : undefined;
  const prize: Localized = customPrize
    ? L(customPrize, customPrize)
    : prizePkg && game
      ? L(`${prizePkg.name} (${ctx.short})`, `${prizePkg.name} (${ctx.short})`)
      : L("a $5 top-up for the game of your choice", "Top Up $5 សម្រាប់ហ្គេមដែលអ្នកចូលចិត្ត");
  const ends = toLocalized(input.ends) ?? defaultGiveawayEnd(input.now);
  const id = ctx.idLabel;
  const handle = input.tiktokHandle?.trim().replace(/^@?/, "@");
  const ask: Localized = game
    ? L(`Comment your current ${ctx.short} rank or level 👇`, `ខមិនប្រាប់ Rank ឬកម្រិតបច្ចុប្បន្នរបស់អ្នកក្នុង ${ctx.short} 👇`)
    : L("Comment the game you play the most 👇", "ខមិនប្រាប់ហ្គេមដែលអ្នកលេងច្រើនជាងគេ 👇");
  const publisher: Localized = game
    ? L(
        `${game.name} and its publisher are not involved in this giveaway; ${store} is an independent reseller.`,
        `${game.name} និងក្រុមហ៊ុនផលិតហ្គេម មិនពាក់ព័ន្ធនឹងកម្មវិធីនេះទេ។ ${store} ជាអ្នកលក់ឯករាជ្យ។`,
      )
    : L(
        `Game publishers are not involved in this giveaway; ${store} is an independent reseller.`,
        `ក្រុមហ៊ុនផលិតហ្គេម មិនពាក់ព័ន្ធនឹងកម្មវិធីនេះទេ។ ${store} ជាអ្នកលក់ឯករាជ្យ។`,
      );
  const nW = (lang: Lang) => (lang === "km" ? kmNumber(winners) : String(winners));

  /** Shared rules; `platform` names the network in the required disclaimer. */
  const rules = (platform: "Facebook" | "TikTok", lang: Lang) =>
    lang === "km"
      ? [
          "• ចូលរួមដោយឥតគិតថ្លៃ មិនចាំបាច់ទិញអ្វីទេ។ ម្នាក់ចូលរួមបានតែម្តង គណនីក្លែងក្លាយ ឬស្ទួន នឹងមិនត្រូវបានរាប់បញ្ចូលទេ។",
          "• សម្រាប់អ្នកលេងនៅកម្ពុជា។ អាយុក្រោម ១៨ ឆ្នាំ? សូមសុំការអនុញ្ញាតពីឪពុកម្តាយ ឬអាណាព្យាបាលជាមុនសិន។",
          `• រង្វាន់៖ ${prize.km} បញ្ចូលផ្ទាល់ទៅ ${id.km} របស់អ្នកឈ្នះ។ មិនអាចប្តូរជាសាច់ប្រាក់បានទេ។`,
          "• ⚠️ យើងមិនដែលសុំលេខសម្ងាត់ លេខកូដ OTP ឬឱ្យបង់ប្រាក់ ដើម្បីទទួលរង្វាន់ទេ។ សូមជឿតែសារពីគណនីផ្លូវការរបស់យើងប៉ុណ្ណោះ។",
          `• កម្មវិធីនេះមិនមែនជាការឧបត្ថម្ភ គាំទ្រ ឬគ្រប់គ្រងដោយ ${platform} ហើយក៏មិនពាក់ព័ន្ធនឹង ${platform} ដែរ។ ដោយការចូលរួម អ្នកយល់ព្រមដោះលែង ${platform} ពីការទទួលខុសត្រូវទាំងអស់ពាក់ព័ន្ធនឹងកម្មវិធីនេះ។`,
          `• ${publisher.km}`,
        ]
      : [
          "• Free to enter, no purchase necessary. One entry per person; fake or duplicate accounts are excluded.",
          "• Open to players in Cambodia. Under 18? Ask a parent or guardian before entering.",
          `• Prize: ${prize.en}, delivered as an in-game top-up to the winner's ${id.en}. No cash alternative.`,
          "• ⚠️ We will NEVER ask for your password, an OTP code or a payment to claim a prize. Only trust messages from our official account.",
          `• This promotion is in no way sponsored, endorsed or administered by, or associated with, ${platform}. By entering, you release ${platform} from all liability related to it.`,
          `• ${publisher.en}`,
        ];

  const fbEn = blocks(
    `🎁 GIVEAWAY — win ${prize.en}! (${winners} winner${winners === 1 ? "" : "s"})`,
    lines(
      "How to enter:",
      "1️⃣ React to this post",
      `2️⃣ ${ask.en} — one comment = one entry`,
      `⭐ Follow ${store} so you don't miss the winner announcement`,
    ),
    `🗓️ Ends ${ends.en} (Phnom Penh time). Winners are drawn at random from valid entries and announced in the comments within 24 hours. We'll message winners from this Page — reply within 48 hours to claim, or we draw again.`,
    lines("📜 Rules", ...rules("Facebook", "en")),
    lines(`👉 Top up while you wait: ${fb.link}`),
    tagLine(fb.tags),
  );
  const fbKm = blocks(
    `🎁 កម្មវិធីចាប់រង្វាន់ — ឈ្នះ ${prize.km}! (អ្នកឈ្នះ ${nW("km")} នាក់)`,
    lines(
      "របៀបចូលរួម៖",
      "១. ចុច React លើប៉ុស្តិ៍នេះ",
      `២. ${ask.km} — ខមិនមួយ = ការចូលរួមមួយ`,
      `⭐ Follow ${store} ដើម្បីកុំឱ្យខកខានការប្រកាសអ្នកឈ្នះ`,
    ),
    `🗓️ ផុតកំណត់ ${ends.km} (ម៉ោងភ្នំពេញ)។ អ្នកឈ្នះនឹងត្រូវជ្រើសរើសដោយចៃដន្យពីការចូលរួមដែលត្រឹមត្រូវ ហើយប្រកាសក្នុងខមិនក្នុងរយៈពេល ២៤ ម៉ោង។ យើងនឹងផ្ញើសារទៅអ្នកឈ្នះពី Page នេះ — សូមឆ្លើយតបក្នុងរយៈពេល ៤៨ ម៉ោង បើមិនដូច្នោះទេ យើងនឹងចាប់ឆ្នោតម្តងទៀត។`,
    lines("📜 លក្ខខណ្ឌ", ...rules("Facebook", "km")),
    lines(`👉 Top Up ខណៈពេលរង់ចាំ៖ ${fb.link}`),
    tagLine(fb.tags),
  );

  const follow = handle ? L(`follow ${handle}`, `Follow ${handle}`) : L("follow us", "Follow យើង");
  return {
    fb: L(fbEn, fbKm),
    tt: L(
      blocks(
        lines(
          `🎁 GIVEAWAY: ${prize.en} for ${winners} winner${winners === 1 ? "" : "s"}!`,
          `To enter: ${ask.en.charAt(0).toLowerCase()}${ask.en.slice(1)} (${follow.en} so you don't miss the results)`,
          `⏰ Ends ${ends.en} (Phnom Penh time). Winners are drawn at random from valid comments, announced in a pinned comment and messaged from this account.`,
        ),
        lines("📜 Rules", ...rules("TikTok", "en")),
        bioLine(tt.link).en,
      ),
      blocks(
        lines(
          `🎁 កម្មវិធីចាប់រង្វាន់៖ ${prize.km} សម្រាប់អ្នកឈ្នះ ${nW("km")} នាក់!`,
          `របៀបចូលរួម៖ ${ask.km} (${follow.km} ដើម្បីកុំឱ្យខកខានលទ្ធផល)`,
          `⏰ ផុតកំណត់ ${ends.km} (ម៉ោងភ្នំពេញ)។ អ្នកឈ្នះនឹងត្រូវជ្រើសរើសដោយចៃដន្យពីខមិនដែលត្រឹមត្រូវ ប្រកាសក្នុងខមិនដែល Pin ហើយយើងនឹងផ្ញើសារពីគណនីនេះ។`,
        ),
        lines("📜 លក្ខខណ្ឌ", ...rules("TikTok", "km")),
        bioLine(tt.link).km,
      ),
    ),
    script: {
      title: L(`Giveaway — ${prize.en}`, `កម្មវិធីចាប់រង្វាន់ — ${prize.km}`),
      beats: [
        {
          kind: "hook",
          at: [0, 3],
          shot: L("Hold up your phone with the prize on screen; add a gift sticker.", "បង្ហាញទូរស័ព្ទដែលមានរង្វាន់នៅលើអេក្រង់ ហើយដាក់ sticker កាដូ។"),
          text: L(`🎁 GIVEAWAY: ${prize.en} × ${winners}`, `🎁 ចាប់រង្វាន់៖ ${prize.km} × ${nW("km")}`),
          vo: L(`We're giving away ${prize.en} to ${winners} players!`, `យើងនឹងផ្តល់ ${prize.km} ជូនអ្នកលេង ${nW("km")} នាក់!`),
        },
        {
          kind: "scene",
          at: [3, 8],
          shot: L("Show the comment section and type an example comment.", "បង្ហាញផ្នែកខមិន ហើយវាយខមិនគំរូមួយ។"),
          text: ask,
          vo: game
            ? L(`To enter, just comment your ${ctx.short} rank.`, `ដើម្បីចូលរួម គ្រាន់តែខមិនប្រាប់ Rank ${ctx.short} របស់អ្នក។`)
            : L("To enter, just comment the game you play most.", "ដើម្បីចូលរួម គ្រាន់តែខមិនប្រាប់ហ្គេមដែលអ្នកលេងច្រើនជាងគេ។"),
        },
        {
          kind: "scene",
          at: [8, 12],
          shot: L("Rules card on screen for 3 seconds (key points from the caption).", "បង្ហាញកាតលក្ខខណ្ឌលើអេក្រង់ ៣ វិនាទី (ចំណុចសំខាន់ពី caption)។"),
          text: L(`Free · no purchase · ends ${ends.en}`, `ឥតគិតថ្លៃ · មិនចាំបាច់ទិញ · ផុតកំណត់ ${ends.km}`),
          vo: L(
            `It's free, no purchase needed. Winners are drawn at random on ${ends.en}.`,
            `ឥតគិតថ្លៃ មិនចាំបាច់ទិញអ្វីទេ។ អ្នកឈ្នះនឹងត្រូវចាប់ឆ្នោតដោយចៃដន្យនៅ ${ends.km}។`,
          ),
        },
        {
          kind: "cta",
          at: [12, 15],
          shot: L("Back to camera, wave goodbye.", "ត្រឡប់មកកាមេរ៉ាវិញ ហើយគ្រវីដៃលា។"),
          text: L("Not sponsored by TikTok · We never ask for passwords", "មិនមែនឧបត្ថម្ភដោយ TikTok · យើងមិនដែលសុំលេខសម្ងាត់"),
          vo: L("Follow so you don't miss the results — good luck!", "Follow ដើម្បីកុំឱ្យខកខានលទ្ធផល — សូមសំណាងល្អ!"),
        },
      ],
      tips: [
        L(
          "Entry is a comment only — never require tagging friends, sharing or extra follows for more entries.",
          "ការចូលរួមគ្រាន់តែខមិនប៉ុណ្ណោះ — កុំតម្រូវឱ្យ Tag មិត្តភក្តិ Share ឬ Follow បន្ថែមដើម្បីបានឱកាសច្រើន។",
        ),
        L(
          "Record the random draw (e.g. a comment picker) and keep it in case anyone asks.",
          "ថតវីដេអូពេលចាប់ឆ្នោត (ឧ. កម្មវិធីជ្រើសខមិនដោយចៃដន្យ) ទុកជាភស្តុតាង។",
        ),
      ],
    },
  };
}

const BUILDERS: Record<CaptionTemplate, (ctx: Ctx) => Built> = {
  price_list: priceList,
  flash_sale: flashSale,
  new_pass: newPass,
  how_to_topup: howToTopUp,
  giveaway,
};

/** Facebook post, TikTok caption and video script (EN + KM) for one template. */
export function generateCaptions(input: CaptionInput): CaptionSet {
  const ctx = buildCtx(input);
  const built = BUILDERS[input.template](ctx);

  let trimmed = false;
  const tiktok = (lang: Lang) => {
    const fit = fitTikTok(built.tt[lang], ctx.tt.tags);
    trimmed ||= fit.trimmed;
    return fit.text;
  };
  const tt = L(tiktok("en"), tiktok("km"));
  if (trimmed) ctx.warnings.push("The TikTok caption was shortened to fit TikTok's 2,200-character limit.");

  const commonTips: Localized[] = [
    L(
      "Keep text away from the right edge and the bottom fifth — TikTok's buttons and caption cover them.",
      "កុំដាក់អក្សរនៅជិតគែមខាងស្តាំ ឬផ្នែកខាងក្រោម ព្រោះប៊ូតុង និង caption របស់ TikTok គ្របបាំង។",
    ),
    L(
      "Use a sound from TikTok's Commercial Music Library — business accounts can't use most trending songs.",
      "ប្រើបទចម្រៀងពី Commercial Music Library របស់ TikTok — គណនី Business មិនអាចប្រើបទល្បីៗភាគច្រើនបានទេ។",
    ),
    L(
      "Blur Player IDs, nicknames and bank details in every screen recording.",
      "បិទបាំង (blur) Player ID ឈ្មោះក្នុងហ្គេម និងព័ត៌មានធនាគារ នៅក្នុងវីដេអូថតអេក្រង់។",
    ),
    L(
      "Use the Story image from the Marketing studio as the cover; no official game logos or art.",
      "ប្រើរូប Story ពី Marketing studio ជា Cover — កុំប្រើឡូហ្គោ ឬរូបផ្លូវការរបស់ហ្គេម។",
    ),
    L(`Pin a comment with the link: ${ctx.tt.link}`, `Pin ខមិនដែលមានលីង៖ ${ctx.tt.link}`),
  ];

  return {
    facebook: built.fb,
    tiktok: tt,
    videoScript: L(renderScript(built.script, "en", commonTips), renderScript(built.script, "km", commonTips)),
    links: { facebook: ctx.fb.link, tiktok: ctx.tt.link },
    warnings: ctx.warnings,
  };
}
