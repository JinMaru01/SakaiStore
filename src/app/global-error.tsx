"use client";

import { useEffect, useSyncExternalStore } from "react";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import common from "@/i18n/messages/common";
import { createTranslator } from "@/i18n/translate";
import "./globals.css";

/*
 * Last-resort error page when the root layout itself fails. It replaces the
 * whole document (no I18nProvider), so it reads the language cookie directly
 * and only bundles the small "common" namespace.
 */
const noopSubscribe = () => () => {};
function readLocale(): Locale {
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${LOCALE_COOKIE}=([^;]+)`));
  return isLocale(m?.[1]) ? m[1] : DEFAULT_LOCALE;
}

export default function GlobalError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const locale = useSyncExternalStore(noopSubscribe, readLocale, () => DEFAULT_LOCALE);
  const t = createTranslator({ common: common[locale] }, { common: common.en });

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang={locale} className="h-full">
      <body className="flex min-h-full items-center justify-center bg-bg p-6 text-fg">
        <title>{t("common.errorPage.title")}</title>
        <main className="max-w-md text-center">
          <p className="font-display text-5xl font-bold text-brand-gradient">:(</p>
          <h1 className="mt-4 text-2xl font-bold">{t("common.errorPage.title")}</h1>
          <p className="mt-3 text-muted">{t("common.errorPage.body")}</p>
          {error.digest && (
            <p className="mt-2 text-xs text-muted">
              {t("common.errorPage.reference")} <code>{error.digest}</code>
            </p>
          )}
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => (retry ?? reset)?.()}
              className="inline-flex h-12 items-center justify-center rounded-xl bg-primary px-6 font-medium text-primary-fg hover:bg-primary-hover"
            >
              {t("common.retry")}
            </button>
            {/* Full page load: the client router may be the thing that broke. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href="/"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-border bg-surface-2 px-6 font-medium hover:bg-surface-3"
            >
              {t("common.notFound.home")}
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
