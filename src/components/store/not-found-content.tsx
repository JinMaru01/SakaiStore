import { House, Search, SearchX } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import type { TranslateFn } from "@/i18n/translate";

/** Shared 404 body for the (store) segment and the root not-found page. */
export function NotFoundContent({ t }: { t: TranslateFn }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-surface-2 text-muted ring-1 ring-border">
        <SearchX className="h-8 w-8" aria-hidden="true" />
      </span>
      <p className="mt-6 font-display text-6xl font-bold text-brand-gradient">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold sm:text-3xl">{t("common.notFound.title")}</h1>
      <p className="mt-3 text-muted">{t("common.notFound.body")}</p>
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Link href="/" className={buttonClasses("primary", "lg")}>
          <House className="h-5 w-5" aria-hidden="true" />
          {t("common.notFound.home")}
        </Link>
        <Link href="/track" className={buttonClasses("secondary", "lg")}>
          <Search className="h-5 w-5" aria-hidden="true" />
          {t("common.notFound.track")}
        </Link>
      </div>
    </div>
  );
}
