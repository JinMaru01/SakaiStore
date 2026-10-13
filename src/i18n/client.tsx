"use client";

import { createContext, useContext, useMemo } from "react";
import type { Locale } from "./config";
import { createTranslator, type MessageTree, type TranslateFn } from "./translate";

type Ctx = { locale: Locale; t: TranslateFn };
const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({
  locale,
  messages,
  fallback,
  children,
}: {
  locale: Locale;
  messages: MessageTree;
  fallback: MessageTree;
  children: React.ReactNode;
}) {
  const value = useMemo(
    () => ({ locale, t: createTranslator(messages, fallback) }),
    [locale, messages, fallback],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Client translator: const t = useT(); t("game.selectPackage") */
export function useT(): TranslateFn {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT must be used inside <I18nProvider>");
  return ctx.t;
}

export function useLocale(): Locale {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useLocale must be used inside <I18nProvider>");
  return ctx.locale;
}
