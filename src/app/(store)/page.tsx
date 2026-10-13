import { ArrowRight, Gamepad2, Search, ShieldCheck, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { FollowUs } from "@/components/social/follow-us";
import { socialLinks } from "@/components/social/social-config";
import { buttonClasses } from "@/components/ui";
import { FaqList, faqEntries } from "@/components/store/faq-list";
import { GameArt, GameTile, type TileGame } from "@/components/store/game-tile";
import { HowItWorks } from "@/components/store/how-it-works";
import { JsonLd } from "@/components/store/json-ld";
import { KhqrBadge, PaymentChips } from "@/components/store/payment-methods";
import { SectionHeading } from "@/components/store/section-heading";
import { TrustChips } from "@/components/store/trust-chips";
import { getT } from "@/i18n/server";
import { listGames, type GameWithMinPrice } from "@/lib/catalog";
import { siteUrl } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  const [{ t, locale }, { store }] = await Promise.all([getT(), getSettings()]);
  const title = `${store.name} — ${t("home.meta.title")}`;
  const description = t("home.meta.description");
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      url: "/",
      siteName: store.name,
      title,
      description,
      locale: locale === "km" ? "km_KH" : "en_US",
      // Setting `openGraph` here replaces the root one, which would drop the
      // image from src/app/opengraph-image.tsx — so link it explicitly.
      images: [
        { url: "/opengraph-image", width: 1200, height: 630, alt: `${store.name} — game top-up in Cambodia` },
      ],
    },
  };
}

const toTile = (g: GameWithMinPrice): TileGame => ({
  slug: g.slug,
  name: g.name,
  currencyName: g.currencyName,
  accentColor: g.accentColor,
  imageUrl: g.imageUrl,
  publisher: g.publisher,
  tagline: g.tagline,
  minPriceCents: g.minPriceCents,
});

const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-6";

export default async function HomePage() {
  const [{ t }, settings, games] = await Promise.all([getT(), getSettings(), listGames()]);
  // Games without active packages cannot be ordered; keep them off the storefront.
  const orderable = games.filter((g) => g.packageCount > 0);
  const tiles = orderable.map(toTile);
  const featured = orderable.filter((g) => g.featured).map(toTile);
  const showcase = (featured.length >= 3 ? featured : tiles).slice(0, 3);
  const fromLabel = t("common.fromPrice");
  const base = siteUrl();

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: settings.store.name,
          url: base,
          logo: `${base}/icon.svg`,
          sameAs: socialLinks(settings.social).map((l) => l.url),
        }}
      />

      {/* ── Hero ── */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        <div aria-hidden="true" className="absolute inset-0 -z-10">
          <div className="absolute -top-40 left-1/2 h-[28rem] w-[56rem] -translate-x-1/2 rounded-full bg-primary/25 blur-[120px]" />
          <div className="absolute top-24 -right-32 h-72 w-72 rounded-full bg-accent/15 blur-[100px]" />
          <div className="absolute inset-0 [background-image:linear-gradient(rgb(255_255_255/0.035)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.035)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,black_30%,transparent_75%)]" />
        </div>

        <div className={cn(CONTAINER, "grid items-center gap-10 py-10 sm:py-16 lg:grid-cols-[1.15fr_1fr] lg:py-20")}>
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-fg sm:text-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
              {t("home.hero.badge")}
            </p>
            <h1 className="mt-4 font-display text-[2rem] leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-6xl [:lang(km)_&]:leading-[1.35]">
              {t("home.hero.titleLine1")}{" "}
              <span className="text-brand-gradient block sm:inline lg:block">{t("home.hero.titleLine2")}</span>
            </h1>
            <p className="mt-4 max-w-xl text-base text-muted sm:text-lg">{t("home.hero.subtitle")}</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="#games" className={buttonClasses("primary", "lg", "w-full sm:w-auto")}>
                <Gamepad2 className="h-5 w-5" aria-hidden="true" />
                {t("home.hero.cta")}
              </Link>
              <Link href="/track" className={buttonClasses("secondary", "lg", "w-full sm:w-auto")}>
                <Search className="h-5 w-5" aria-hidden="true" />
                {t("home.hero.secondary")}
              </Link>
            </div>
            <TrustChips t={t} className="mt-7" />
          </div>

          {showcase.length > 0 && (
            <div aria-hidden="true" className="relative mx-auto hidden h-[24rem] w-full max-w-md md:block">
              {showcase.map((g, i) => (
                <div
                  key={g.slug}
                  className={cn(
                    "absolute w-40 rounded-3xl bg-surface/85 p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/10 backdrop-blur lg:w-44",
                    i === 0 && "top-12 left-2 -rotate-6",
                    i === 1 && "top-0 right-4 rotate-6",
                    i === 2 && "right-0 bottom-6 z-10 rotate-[-3deg]",
                  )}
                >
                  <GameArt game={g} sizes="176px" priority />
                </div>
              ))}
              <div className="absolute bottom-0 left-0 z-20 flex items-center gap-3 rounded-2xl border border-border bg-surface/95 px-4 py-3 shadow-xl">
                <KhqrBadge className="h-7 text-xs" />
                <div className="text-sm">
                  <p className="font-semibold">{t("home.hero.paidToast")}</p>
                  <p className="text-xs text-muted">{t("home.hero.paidToastSub")}</p>
                </div>
                <ShieldCheck className="h-5 w-5 text-success" />
              </div>
            </div>
          )}
        </div>
      </section>

      <div className={cn(CONTAINER, "space-y-16 py-10 sm:space-y-20 sm:py-14")}>
        {/* ── Games ── */}
        {tiles.length === 0 ? (
          <section id="games" className="scroll-mt-24 rounded-[var(--radius-card)] border border-dashed border-border p-10 text-center">
            <Gamepad2 className="mx-auto h-10 w-10 text-muted" aria-hidden="true" />
            <p className="mt-3 text-muted">{t("home.games.empty")}</p>
          </section>
        ) : (
          <>
            {featured.length > 0 && (
              <section aria-labelledby="popular-games">
                <SectionHeading
                  id="popular-games"
                  title={t("home.games.popularTitle")}
                  subtitle={t("home.games.popularSubtitle")}
                />
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {featured.slice(0, 8).map((g, i) => (
                    <li key={g.slug}>
                      <GameTile
                        game={g}
                        variant="featured"
                        fromLabel={fromLabel}
                        ctaLabel={t("home.games.topUp")}
                        priority={i < 2}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section id="games" aria-labelledby="all-games" className="scroll-mt-24">
              <SectionHeading
                id="all-games"
                title={t("home.games.allTitle")}
                subtitle={t("home.games.allSubtitle", { count: tiles.length })}
              />
              <ul className="grid grid-cols-3 gap-x-3 gap-y-5 sm:grid-cols-4 sm:gap-x-4 md:grid-cols-5 lg:grid-cols-6">
                {tiles.map((g) => (
                  <li key={g.slug}>
                    <GameTile game={g} fromLabel={fromLabel} />
                  </li>
                ))}
              </ul>
            </section>
          </>
        )}

        <HowItWorks t={t} />

        {/* ── Payment methods ── */}
        <section
          aria-labelledby="payments"
          className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-6 sm:p-8"
        >
          <div aria-hidden="true" className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-[#e1232e]/15 blur-3xl" />
          <div className="relative grid grid-cols-1 gap-6 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div>
              <h2 id="payments" className="font-display text-xl font-bold sm:text-2xl">
                {t("home.payments.title")}
              </h2>
              <p className="mt-2 max-w-xl text-sm text-muted sm:text-base">{t("home.payments.body")}</p>
            </div>
            <PaymentChips anyBankLabel={t("common.payments.anyBakong")} />
          </div>
        </section>

        <FollowUs social={settings.social} marketing={settings.marketing} />

        {/* ── FAQ ── */}
        <section aria-labelledby="home-faq">
          <SectionHeading
            id="home-faq"
            title={t("home.faq.title")}
            subtitle={t("home.faq.subtitle")}
            action={
              <Link
                href="/faq"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-fg"
              >
                {t("home.faq.more")}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            }
          />
          <FaqList items={faqEntries(t, ["delivery", "findId", "payment", "safety"])} />
        </section>

        {/* ── Final CTA ── */}
        <section className="relative overflow-hidden rounded-[var(--radius-card)] bg-brand-gradient p-[1px]">
          <div className="relative rounded-[calc(var(--radius-card)-1px)] bg-bg/85 px-6 py-10 text-center sm:py-14">
            <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgb(124_92_255/0.25),transparent_70%)]" />
            <div className="relative">
              <h2 className="font-display text-2xl font-bold sm:text-4xl">{t("home.cta.title")}</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted sm:text-lg">{t("home.cta.body")}</p>
              <Link href="#games" className={buttonClasses("primary", "lg", "mt-6")}>
                {t("home.cta.button")}
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
