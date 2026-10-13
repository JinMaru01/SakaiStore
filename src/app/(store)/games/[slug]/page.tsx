import { ChevronRight, Headphones, QrCode, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { getFollowPromo } from "@/components/social/follow-promo";
import { ShareBar } from "@/components/social/share-bar";
import { GameArt } from "@/components/store/game-tile";
import { JsonLd } from "@/components/store/json-ld";
import { OrderForm } from "@/components/store/order-form/order-form";
import { localizedText, toFormGame, toFormPackage } from "@/components/store/order-form/types";
import { safeHex, withAlpha } from "@/components/store/game-art";
import { paragraphs } from "@/components/store/rich-text";
import { getT } from "@/i18n/server";
import { getGameBySlug } from "@/lib/catalog";
import { env, siteUrl } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { formatUsd } from "@/lib/utils";

// Shared by generateMetadata and the page within one request.
const loadGame = cache((slug: string) => getGameBySlug(slug));

const minPriceCents = (packages: { priceCents: number }[]) =>
  packages.length ? Math.min(...packages.map((p) => p.priceCents)) : null;

export async function generateMetadata(props: PageProps<"/games/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const [game, { t, locale }, { store }] = await Promise.all([loadGame(slug), getT(), getSettings()]);
  if (!game) return { title: t("common.notFound.title"), robots: { index: false } };

  const min = minPriceCents(game.packages);
  const title = t("game.meta.title", { game: game.name });
  const description =
    min != null
      ? t("game.meta.description", { game: game.name, currency: game.currencyName, price: formatUsd(min) })
      : t("game.meta.descriptionNoPrice", { game: game.name, currency: game.currencyName });
  const url = `/games/${game.slug}`;
  return {
    title,
    description,
    keywords: game.hashtags?.replace(/#/g, "").split(/\s+/).filter(Boolean),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: store.name,
      title: `${title} | ${store.name}`,
      description,
      locale: locale === "km" ? "km_KH" : "en_US",
    },
  };
}

/** Promo code from a shared link, e.g. /games/free-fire?promo=TIKTOK5 (from social captions). */
function promoFromQuery(v: string | string[] | undefined): string {
  const s = Array.isArray(v) ? v[0] : v;
  return s && /^[A-Za-z0-9_-]{1,32}$/.test(s) ? s.toUpperCase() : "";
}

export default async function GamePage(props: PageProps<"/games/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const [game, settings, { t, locale }] = await Promise.all([loadGame(slug), getSettings(), getT()]);
  if (!game) notFound();
  // Advertise the follower code only while it works for this game, with its conditions (e.g. min order).
  const followPromo = await getFollowPromo(settings.marketing.followPromoCode, { gameId: game.id });

  const min = minPriceCents(game.packages);
  const base = siteUrl();
  const pageUrl = `${base}/games/${game.slug}`;
  const accent = safeHex(game.accentColor);
  const packages = game.packages.map(toFormPackage);
  // Admin-written copy in the visitor's language (Khmer columns fall back to English).
  const tagline = localizedText(locale, game.tagline, game.taglineKm);
  const description = localizedText(locale, game.description, game.descriptionKm);

  return (
    <>
      {min != null && (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "Product",
            name: t("game.meta.title", { game: game.name }),
            description: description ?? tagline ?? undefined,
            brand: { "@type": "Brand", name: settings.store.name },
            url: pageUrl,
            offers: {
              "@type": "AggregateOffer",
              priceCurrency: "USD",
              lowPrice: (min / 100).toFixed(2),
              highPrice: (Math.max(...game.packages.map((p) => p.priceCents)) / 100).toFixed(2),
              offerCount: game.packages.length,
              availability: "https://schema.org/InStock",
            },
          }}
        />
      )}

      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10"
          style={{
            backgroundImage: `radial-gradient(60rem 18rem at 15% -10%, ${withAlpha(accent, 0.35)}, transparent 70%)`,
          }}
        />
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8">
          <nav aria-label={t("game.breadcrumb.label")}>
            <ol className="flex flex-wrap items-center gap-1 text-xs text-muted sm:text-sm">
              <li>
                <Link href="/" className="hover:text-fg">
                  {t("common.nav.home")}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li>
                <Link href="/#games" className="hover:text-fg">
                  {t("common.nav.games")}
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="h-3.5 w-3.5" />
              </li>
              <li aria-current="page" className="max-w-[12rem] truncate text-fg sm:max-w-none">
                {game.name}
              </li>
            </ol>
          </nav>

          <div className="mt-4 flex items-center gap-4 sm:mt-6 sm:gap-6">
            <GameArt
              game={game}
              priority
              sizes="(min-width: 640px) 112px, 80px"
              className="w-20 shrink-0 shadow-xl shadow-black/40 sm:w-28"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold tracking-wider text-accent uppercase">
                {t("game.header.eyebrow", { currency: game.currencyName })}
              </p>
              <h1 className="mt-1 font-display text-2xl leading-tight font-bold sm:text-4xl">{game.name}</h1>
              {(game.publisher || tagline) && (
                <p className="mt-1 text-sm text-muted sm:text-base">
                  {[game.publisher, tagline].filter(Boolean).join(" · ")}
                </p>
              )}
            </div>
          </div>

          <ul className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted sm:text-sm">
            <li className="flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-warning" aria-hidden="true" />
              {t("home.trust.fast")}
            </li>
            <li className="flex items-center gap-1.5">
              <QrCode className="h-4 w-4 text-[#ff5a63]" aria-hidden="true" />
              {t("home.trust.khqr")}
            </li>
            <li className="flex items-center gap-1.5">
              <Headphones className="h-4 w-4 text-accent" aria-hidden="true" />
              {t("home.trust.support")}
            </li>
          </ul>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 pt-6 pb-8 sm:px-6 sm:pt-8">
        <OrderForm
          game={toFormGame(game, locale)}
          packages={packages}
          khrPerUsd={settings.store.khrPerUsd}
          followCode={followPromo?.code ?? ""}
          followTerms={followPromo?.terms ?? null}
          nameLookup={env().PLAYER_LOOKUP_MODE !== "none"}
          initialPromo={promoFromQuery(searchParams.promo)}
        >
          <ShareBar
            url={pageUrl}
            title={t("game.meta.title", { game: game.name })}
            text={
              min != null
                ? t("social.share.gameText", { game: game.name, price: formatUsd(min), store: settings.store.name })
                : t("social.share.gameTextNoPrice", { game: game.name, store: settings.store.name })
            }
            heading={t("social.share.gameHeading")}
          />
          {description && (
            <section aria-labelledby="about-game" className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
              <h2 id="about-game" className="font-display font-semibold">
                {t("game.about.title", { game: game.name })}
              </h2>
              <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted">
                {paragraphs(description).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </section>
          )}
        </OrderForm>
      </div>
    </>
  );
}
