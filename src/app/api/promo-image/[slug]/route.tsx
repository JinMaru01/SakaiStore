import { AllGamesPoster, GamePoster, posterCardCount } from "@/components/marketing/og/promo-poster";
import { renderPng } from "@/components/marketing/og/render";
import { requireAdminApi } from "@/lib/auth";
import { siteUrl } from "@/lib/env";
import { displayHost } from "@/lib/marketing/og-text";
import { loadCatalogPosterGames, loadLivePromo, loadPosterGame, posterPromo } from "@/lib/marketing/promo-data";
import {
  ALL_GAMES_SLUG,
  isPromoFormat,
  isPromoSlug,
  PROMO_FORMATS,
  promoImageFileName,
  type PromoFormat,
} from "@/lib/marketing/promo-formats";
import { getSettings } from "@/lib/settings";

/**
 * GET /api/promo-image/[slug]?format=square|portrait|story[&code=FB5|none][&download=1]
 *
 * Admin-only price-list poster for posting on Facebook / TikTok:
 *   square 1080×1080 (Facebook post), portrait 1080×1350 (feed),
 *   story 1080×1920 (TikTok cover, Reels, Stories).
 * slug "all" = every featured game. `code` picks the promo code shown
 * (default: the follower code from settings; "none" hides it). Only codes that
 * are live and valid for the game are printed.
 */

export const dynamic = "force-dynamic";

const CODE_RE = /^[A-Za-z0-9_-]{1,32}$/;
const PRIVATE_CACHE = "private, max-age=300";

const errorJson = (error: string, status: number) =>
  Response.json({ error }, { status, headers: { "cache-control": "no-store" } });

export async function GET(request: Request, ctx: RouteContext<"/api/promo-image/[slug]">) {
  const denied = await requireAdminApi();
  if (denied) return denied;

  const slug = (await ctx.params).slug.trim().toLowerCase();
  if (!isPromoSlug(slug)) return errorJson("not_found", 404);

  const url = new URL(request.url);
  const formatParam = url.searchParams.get("format") ?? "square";
  if (!isPromoFormat(formatParam)) return errorJson("invalid_format", 400);
  const format: PromoFormat = formatParam;
  const codeParam = url.searchParams.get("code");
  if (codeParam != null && codeParam !== "none" && !CODE_RE.test(codeParam)) return errorJson("invalid_code", 400);
  const download = url.searchParams.get("download") === "1";

  const settings = await getSettings();
  const code = codeParam == null ? settings.marketing.followPromoCode : codeParam === "none" ? null : codeParam;
  const host = displayHost(siteUrl());
  const common = { format, storeName: settings.store.name, host };

  let element: React.ReactElement;
  if (slug === ALL_GAMES_SLUG) {
    const games = await loadCatalogPosterGames(posterCardCount(format, true));
    if (games.length === 0) return errorJson("no_games", 404);
    const promo = posterPromo(await loadLivePromo(code, null));
    element = <AllGamesPoster {...common} promo={promo} games={games} />;
  } else {
    const game = await loadPosterGame(slug);
    if (!game) return errorJson("not_found", 404);
    if (game.packages.length === 0) return errorJson("no_packages", 404);
    const promo = posterPromo(await loadLivePromo(code, game.id));
    element = <GamePoster {...common} promo={promo} game={game} />;
  }

  const fileName = promoImageFileName(settings.store.name, slug, format);
  try {
    return await renderPng(element, {
      ...PROMO_FORMATS[format],
      headers: {
        "cache-control": PRIVATE_CACHE,
        "content-disposition": `${download ? "attachment" : "inline"}; filename="${fileName}"`,
        "x-content-type-options": "nosniff",
      },
    });
  } catch (err) {
    console.error(`[promo-image] render failed for ${slug} (${format})`, err);
    return errorJson("render_failed", 500);
  }
}
