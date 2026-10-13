import { BookOpen, ExternalLink } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/page-header";
import { CaptionStudio } from "@/components/marketing/studio/caption-studio";
import { ChannelPerformanceView } from "@/components/marketing/studio/channel-performance";
import { GamePicker, studioHref } from "@/components/marketing/studio/game-picker";
import { PromoImages } from "@/components/marketing/studio/promo-images";
import { PLAYBOOK_PATH, SetupChecklist } from "@/components/marketing/studio/setup-checklist";
import { UtmBuilder } from "@/components/marketing/studio/utm-builder";
import { buttonClasses, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { lastDaysWindow } from "@/lib/admin/time";
import { requireAdmin } from "@/lib/auth";
import { getGameBySlug, listGames } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { getChannelPerformance, getPromoUsageByChannel, getTopCampaigns, parsePeriod } from "@/lib/marketing/analytics";
import { buildSetupChecklist } from "@/lib/marketing/checklist";
import { offerAppliesTo } from "@/lib/marketing/promo-offer";
import { ALL_GAMES_SLUG } from "@/lib/marketing/promo-formats";
import { contentVersion, defaultPlatformCodes, listPromoCodes, livePromoOptions } from "@/lib/marketing/studio-data";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Marketing" };

const SECTIONS = [
  { id: "images", label: "Images" },
  { id: "captions", label: "Captions" },
  { id: "links", label: "Links" },
  { id: "performance", label: "Performance" },
] as const;

/** "@sakaistore" from https://www.tiktok.com/@sakaistore */
function tiktokHandle(url: string): string | null {
  const m = url.match(/tiktok\.com\/@([\w.]{2,24})/i);
  return m ? `@${m[1]}` : null;
}

export default async function MarketingStudioPage(props: PageProps<"/admin/marketing">) {
  await requireAdmin();
  const sp = await props.searchParams;
  const days = parsePeriod(sp.days);
  const gameParam = typeof sp.game === "string" ? sp.game.trim().toLowerCase() : "";
  const now = new Date();
  const window = lastDaysWindow(days, now);

  const [settings, games, promos, version, performance, promoUsage, campaigns] = await Promise.all([
    getSettings(),
    listGames({ includeInactive: true }),
    listPromoCodes(),
    contentVersion(),
    getChannelPerformance(days, now),
    getPromoUsageByChannel(window),
    getTopCampaigns(window, 10),
  ]);

  const selected = games.find((g) => g.slug === gameParam) ?? null;
  const detail = selected ? await getGameBySlug(selected.slug, { includeInactive: true }) : null;
  const packages = (detail?.packages ?? []).filter((p) => p.active);
  const site = siteUrl();

  const options = livePromoOptions(promos, now).filter((o) => offerAppliesTo(o.offer, selected?.id ?? null));
  const followCode = settings.marketing.followPromoCode.trim().toUpperCase();
  const defaults = defaultPlatformCodes(options, followCode);
  const checklist = buildSetupChecklist({
    social: settings.social,
    marketing: settings.marketing,
    // NEXT_PUBLIC_* ids are public by design and not part of the server env schema.
    pixels: { meta: process.env.NEXT_PUBLIC_FB_PIXEL_ID, tiktok: process.env.NEXT_PUBLIC_TIKTOK_PIXEL_ID },
    followPromo: promos.find((p) => p.code.toUpperCase() === followCode) ?? null,
    channelPromos: promos.filter((p) => p.channel),
    now,
  });
  const setupDone = checklist.every((i) => i.done);

  const catalog = games
    .filter((g) => g.active && g.packageCount > 0)
    .map((g) => ({ slug: g.slug, name: g.name, currencyName: g.currencyName, minPriceCents: g.minPriceCents }));
  const title = selected?.name ?? "All games";
  const studioKey = selected?.slug ?? ALL_GAMES_SLUG;
  const codeOptions = options.map((o) => ({ code: o.code, label: o.label, offer: o.offer }));

  return (
    <>
      <PageHeader
        title="Marketing studio"
        description="Post-ready images, captions and tracked links for your Facebook Page and TikTok — and which channel actually sells."
        actions={
          <>
            <Link href={PLAYBOOK_PATH} className={buttonClasses("secondary", "md")}>
              <BookOpen className="h-4 w-4" aria-hidden="true" />
              Playbook
            </Link>
            <a href={site} target="_blank" rel="noopener" className={buttonClasses("ghost", "md")}>
              <ExternalLink className="h-4 w-4" aria-hidden="true" />
              View store
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </>
        }
      />

      {!setupDone && (
        <div className="mb-6">
          <SetupChecklist items={checklist} />
        </div>
      )}

      <section aria-labelledby="pick-title">
        <h2 id="pick-title" className="mb-2 font-display text-base font-semibold sm:text-lg">
          What are you promoting?
        </h2>
        <GamePicker games={games} selected={selected?.slug ?? null} days={days} />
        {gameParam && !selected && <p className="mt-1 text-sm text-warning">That game was not found — showing all games.</p>}
        <nav aria-label="Studio sections" className="mt-3 flex flex-wrap gap-2 text-sm">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className="rounded-lg px-2.5 py-1 text-muted ring-1 ring-border hover:text-fg">
              {s.label}
            </a>
          ))}
        </nav>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6">
        <Card id="images" className="scroll-mt-20">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Promo images — {title}</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                Square for Facebook posts, portrait for the feed, story for TikTok covers, Reels and Stories.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            {selected && packages.length === 0 ? (
              <p className="text-sm text-warning">
                {selected.name} has no active packages.{" "}
                <Link href="/admin/games" className="font-medium text-primary hover:text-fg">
                  Add prices
                </Link>{" "}
                first.
              </p>
            ) : catalog.length === 0 && !selected ? (
              <p className="text-sm text-muted">Add games with prices to generate the all-games price list.</p>
            ) : (
              <PromoImages
                key={studioKey}
                slug={studioKey}
                title={title}
                storeName={settings.store.name}
                codes={codeOptions}
                defaultCode={options.some((o) => o.code === followCode) ? followCode : null}
                version={version}
              />
            )}
          </CardContent>
        </Card>

        <Card id="captions" className="scroll-mt-20">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Captions & video scripts — {title}</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                Facebook post, TikTok caption and a 15–30 s video script in Khmer and English. Links carry UTM tags
                and the platform’s promo code.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <CaptionStudio
              key={studioKey}
              game={
                selected
                  ? {
                      id: selected.id,
                      slug: selected.slug,
                      name: selected.name,
                      currencyName: selected.currencyName,
                      idLabel: selected.idLabel,
                      requiresZone: selected.requiresZone,
                      zoneLabel: selected.zoneLabel,
                      hashtags: selected.hashtags,
                    }
                  : null
              }
              packages={packages.map((p) => ({
                name: p.name,
                priceCents: p.priceCents,
                compareAtCents: p.compareAtCents,
                badge: p.badge,
              }))}
              catalog={catalog}
              storeName={settings.store.name}
              siteUrl={site}
              hashtags={settings.marketing.defaultHashtags}
              tiktokHandle={tiktokHandle(settings.social.tiktokUrl)}
              codes={codeOptions}
              defaultCodes={defaults}
              nowIso={now.toISOString()}
            />
          </CardContent>
        </Card>

        <Card id="links" className="scroll-mt-20">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Tracked links</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                Every link you paste anywhere should carry UTM tags — that is how orders get credited to Facebook,
                TikTok or Telegram below.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <UtmBuilder
              key={studioKey}
              siteUrl={site}
              game={selected ? { slug: selected.slug, name: selected.name } : null}
              codes={codeOptions.map(({ code, label }) => ({ code, label }))}
            />
          </CardContent>
        </Card>

        <Card id="performance" className="scroll-mt-20">
          <CardHeader className="items-start">
            <div>
              <CardTitle>Channel performance</CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                Orders are credited to the last Facebook / TikTok / Telegram visit within 30 days; a channel promo code
                credits orders that look direct.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <ChannelPerformanceView
              performance={performance}
              promoUsage={promoUsage}
              campaigns={campaigns}
              periodHref={(d) => `${studioHref({ game: selected?.slug ?? null, days: d })}#performance`}
            />
          </CardContent>
        </Card>

        {setupDone && <SetupChecklist items={checklist} />}
      </div>
    </>
  );
}
