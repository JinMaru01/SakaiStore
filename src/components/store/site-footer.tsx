import { Phone } from "lucide-react";
import Link from "next/link";
import { TelegramIcon } from "@/components/icons/brand";
import { SocialLinks } from "@/components/social/social-links";
import { telegramHandle, telegramUserUrl, telHref } from "@/components/social/social-config";
import type { TranslateFn } from "@/i18n/translate";
import type { Settings } from "@/lib/settings";
import { Logo } from "./logo";
import { PaymentChips } from "./payment-methods";

const LINK = "text-sm text-muted transition-colors hover:text-fg";

export function SiteFooter({ settings, t, year }: { settings: Settings; t: TranslateFn; year: number }) {
  const { store } = settings;
  const phoneHref = telHref(store.supportPhone);
  const tgUrl = telegramUserUrl(store.supportTelegram);
  const tgHandle = telegramHandle(store.supportTelegram);

  return (
    // Pages with the fixed mobile pay bar (data-bottom-bar) get extra bottom room so it never hides the footer
    // (--bottom-bar-h is the bar's measured height, set by MobileBar).
    <footer className="mt-16 border-t border-border bg-surface/40 max-lg:[body:has([data-bottom-bar])_&]:pb-[calc(var(--bottom-bar-h,7rem)_+_1rem)]">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr]">
        <div>
          <Link href="/" className="inline-block rounded-lg" aria-label={store.name}>
            <Logo name={store.name} />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            {t("common.footer.about", { store: store.name })}
          </p>
          <SocialLinks social={settings.social} labelTemplate={t("social.linkLabel")} className="mt-5" />
        </div>

        <nav aria-labelledby="footer-links">
          <h2 id="footer-links" className="font-display text-sm font-semibold tracking-wide text-fg uppercase">
            {t("common.footer.quickLinks")}
          </h2>
          <ul className="mt-4 grid gap-2.5">
            <li>
              <Link href="/#games" className={LINK}>
                {t("common.nav.games")}
              </Link>
            </li>
            <li>
              <Link href="/track" className={LINK}>
                {t("common.nav.track")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className={LINK}>
                {t("common.nav.faq")}
              </Link>
            </li>
            <li>
              <Link href="/terms" className={LINK}>
                {t("common.footer.terms")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className={LINK}>
                {t("common.footer.privacy")}
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-fg uppercase">
            {t("common.footer.payments")}
          </h2>
          <PaymentChips className="mt-4" anyBankLabel={t("common.payments.anyBakong")} />
          <p className="mt-3 text-xs text-muted">{t("common.footer.paymentsNote")}</p>
        </div>

        <div>
          <h2 className="font-display text-sm font-semibold tracking-wide text-fg uppercase">
            {t("common.footer.support")}
          </h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {tgUrl && (
              <li>
                <a
                  href={tgUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2.5 text-muted transition-colors hover:text-fg"
                >
                  <TelegramIcon className="h-4 w-4 text-telegram" />
                  <span>
                    {t("common.footer.telegram")}: <span className="text-fg">{tgHandle}</span>
                  </span>
                </a>
              </li>
            )}
            {phoneHref && (
              <li>
                <a
                  href={phoneHref}
                  className="inline-flex items-center gap-2.5 text-muted transition-colors hover:text-fg"
                >
                  <Phone className="h-4 w-4 text-accent" aria-hidden="true" />
                  <span>
                    {t("common.footer.phone")}: <span className="text-fg">{store.supportPhone}</span>
                  </span>
                </a>
              </li>
            )}
            <li className="text-muted">{t("common.footer.hours")}</li>
          </ul>
        </div>
      </div>

      <div className="border-t border-border/70">
        <div className="mx-auto max-w-6xl space-y-2 px-4 py-6 text-xs leading-relaxed text-muted sm:px-6">
          <p>{t("common.footer.disclaimer", { store: store.name })}</p>
          <p>{t("common.footer.copyright", { year, store: store.name })}</p>
        </div>
      </div>
    </footer>
  );
}
