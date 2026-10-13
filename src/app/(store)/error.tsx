"use client";

import { House, RotateCcw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui";
import { useT } from "@/i18n/client";

/** Error boundary for the store pages (inside the store layout, so header/footer stay usable). */
export default function StoreError({
  error,
  retry,
  reset,
}: {
  error: Error & { digest?: string };
  retry?: () => void;
  reset?: () => void;
}) {
  const t = useT();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center px-4 py-20 text-center sm:py-28">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-danger/15 text-danger ring-1 ring-danger/30">
        <TriangleAlert className="h-8 w-8" aria-hidden="true" />
      </span>
      <h1 className="mt-6 font-display text-2xl font-bold sm:text-3xl">{t("common.errorPage.title")}</h1>
      <p className="mt-3 text-muted">{t("common.errorPage.body")}</p>
      {error.digest && (
        <p className="mt-2 text-xs text-muted">
          {t("common.errorPage.reference")} <code className="font-mono">{error.digest}</code>
        </p>
      )}
      <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        <Button size="lg" onClick={() => (retry ?? reset)?.()}>
          <RotateCcw className="h-5 w-5" aria-hidden="true" />
          {t("common.retry")}
        </Button>
        <Link href="/" className={buttonClasses("secondary", "lg")}>
          <House className="h-5 w-5" aria-hidden="true" />
          {t("common.notFound.home")}
        </Link>
      </div>
    </div>
  );
}
