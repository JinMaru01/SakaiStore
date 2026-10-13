import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getMessages } from "./messages";
import { createTranslator, type TranslateFn } from "./translate";

/** Current locale from the `sk_lang` cookie (default English). */
export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(v) ? v : DEFAULT_LOCALE;
}

/** Server-side translator: const { t, locale } = await getT(); t("home.heroTitle") */
export async function getT(): Promise<{ t: TranslateFn; locale: Locale }> {
  const locale = await getLocale();
  return { t: translatorFor(locale), locale };
}

export function translatorFor(locale: Locale): TranslateFn {
  return createTranslator(getMessages(locale), getMessages(DEFAULT_LOCALE));
}
