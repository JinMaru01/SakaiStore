"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setLocale } from "@/i18n/actions";
import { useLocale, useT } from "@/i18n/client";
import { LOCALES, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

const SHORT: Record<Locale, string> = { en: "EN", km: "ខ្មែរ" };
const LANG_NAME: Record<Locale, string> = { en: "English", km: "ភាសាខ្មែរ" };

/** EN / ខ្មែរ segmented switch. Stores the choice in the sk_lang cookie, then re-renders server components. */
export function LanguageSwitcher({ className }: { className?: string }) {
  const locale = useLocale();
  const t = useT();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function choose(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={t("common.language")}
      className={cn(
        "inline-flex h-9 items-center rounded-xl border border-border bg-surface-2/70 p-0.5 text-xs font-semibold",
        pending && "opacity-70",
        className,
      )}
    >
      {LOCALES.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            lang={l}
            onClick={() => choose(l)}
            aria-pressed={active}
            aria-label={LANG_NAME[l]}
            disabled={pending}
            className={cn(
              "h-full min-w-10 rounded-[10px] px-2.5 transition-colors",
              active ? "bg-primary text-primary-fg shadow-sm" : "text-muted hover:text-fg",
            )}
          >
            {SHORT[l]}
          </button>
        );
      })}
    </div>
  );
}
