/**
 * UTM link building for social posts, bios, ads and auto-replies. Pure; safe
 * for server and client. utm_source values are chosen so classifyChannel()
 * (src/lib/attribution.ts) files the order under the right channel:
 * facebook/messenger → Facebook, tiktok → TikTok, telegram → Telegram.
 */

export type UtmParams = {
  /** facebook | messenger | tiktok | telegram | … */
  source: string;
  /** social | paid_social | chat | … */
  medium: string;
  /** Game slug or template, e.g. "mobile-legends", "flash_sale". */
  campaign: string;
  content?: string | null;
  term?: string | null;
};

/** Click ids / UTMs we always replace, so a copied link never carries someone else's tracking. */
const TRACKING_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid", "ttclid", "gclid"];

/**
 * Normalize a UTM value: lowercase, spaces → "_", only [a-z0-9._-], max 100.
 * Consistent casing matters: "TikTok" and "tiktok" would split reports.
 */
export function utmValue(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9._-]/g, "")
    .replace(/_{2,}/g, "_")
    .slice(0, 100);
}

/**
 * `baseUrl` tagged with utm_source/medium/campaign (+ content/term when set).
 * Other query params (e.g. ?promo=FB5) are kept; existing UTMs and click ids
 * are replaced. Invalid URLs are returned unchanged.
 */
export function buildUtmLink(baseUrl: string, params: UtmParams): string {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return baseUrl;
  }
  for (const p of TRACKING_PARAMS) url.searchParams.delete(p);
  const entries: [string, string][] = [
    ["utm_source", utmValue(params.source)],
    ["utm_medium", utmValue(params.medium)],
    ["utm_campaign", utmValue(params.campaign)],
    ["utm_content", utmValue(params.content)],
    ["utm_term", utmValue(params.term)],
  ];
  for (const [key, value] of entries) if (value) url.searchParams.set(key, value);
  return url.toString();
}

/** Adds ?promo=CODE so the game page pre-fills the code (see promoFromQuery on the game page). */
export function withPromoParam(url: string, code: string | null | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  if (!/^[A-Z0-9_-]{1,32}$/.test(c)) return url;
  try {
    const u = new URL(url);
    u.searchParams.set("promo", c);
    return u.toString();
  } catch {
    return url;
  }
}

export type UtmPresetId =
  | "facebook_post"
  | "facebook_ad"
  | "messenger_auto_reply"
  | "tiktok_bio"
  | "tiktok_comment"
  | "tiktok_ad"
  | "telegram_channel";

export type UtmPreset = {
  id: UtmPresetId;
  label: string;
  /** Where to paste the link. */
  hint: string;
  source: string;
  medium: string;
  /** "game" = the selected game slug ("all-games" when none). */
  campaign: "game" | string;
  content?: string;
  /** Bio / auto-reply links usually point at the home page. */
  homeOnly?: boolean;
};

export const ALL_GAMES_CAMPAIGN = "all-games";

export const UTM_PRESETS: readonly UtmPreset[] = [
  {
    id: "facebook_post",
    label: "Facebook page post",
    hint: "Paste in the post text or as the link of a photo post.",
    source: "facebook",
    medium: "social",
    campaign: "game",
    content: "page_post",
  },
  {
    id: "facebook_ad",
    label: "Facebook / Instagram ad",
    hint: "Ads Manager → Website URL. Tip: add {{ad.name}} as utm_content in URL parameters.",
    source: "facebook",
    medium: "paid_social",
    campaign: "game",
    content: "ad",
  },
  {
    id: "messenger_auto_reply",
    label: "Messenger auto-reply",
    hint: "Meta Business Suite → Inbox → Automations → Instant reply / Saved replies.",
    source: "messenger",
    medium: "chat",
    campaign: "instant_reply",
    homeOnly: true,
  },
  {
    id: "tiktok_bio",
    label: "TikTok bio link",
    hint: "TikTok profile → Edit profile → Website (Business account).",
    source: "tiktok",
    medium: "social",
    campaign: "bio",
    homeOnly: true,
  },
  {
    id: "tiktok_comment",
    label: "TikTok pinned comment",
    hint: "Comment under your video, then long-press → Pin.",
    source: "tiktok",
    medium: "social",
    campaign: "game",
    content: "pinned_comment",
  },
  {
    id: "tiktok_ad",
    label: "TikTok ad",
    hint: "TikTok Ads Manager → Destination URL. Tip: utm_content=__CID_NAME__ names the ad.",
    source: "tiktok",
    medium: "paid_social",
    campaign: "game",
    content: "ad",
  },
  {
    id: "telegram_channel",
    label: "Telegram channel",
    hint: "Channel post or pinned message.",
    source: "telegram",
    medium: "social",
    campaign: "game",
    content: "channel_post",
  },
];

/** UTM params for a preset and the selected game (null = all games). */
export function presetParams(preset: UtmPreset, gameSlug: string | null): UtmParams {
  return {
    source: preset.source,
    medium: preset.medium,
    campaign: preset.campaign === "game" ? gameSlug || ALL_GAMES_CAMPAIGN : preset.campaign,
    content: preset.content ?? null,
  };
}

/** Landing URL for a preset: the game page, or home for bio / auto-reply / all games. */
export function presetLandingUrl(siteUrl: string, preset: UtmPreset, gameSlug: string | null): string {
  const base = siteUrl.replace(/\/+$/, "");
  return !preset.homeOnly && gameSlug ? `${base}/games/${encodeURIComponent(gameSlug)}` : `${base}/`;
}
