import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Kantumruy_Pro } from "next/font/google";
import { AttributionCapture } from "@/components/marketing/attribution-capture";
import { TrackingScripts } from "@/components/marketing/tracking-scripts";
import { I18nProvider } from "@/i18n/client";
import { DEFAULT_LOCALE } from "@/i18n/config";
import { getMessages } from "@/i18n/messages";
import { getLocale } from "@/i18n/server";
import { siteUrl } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import "./globals.css";

const kantumruy = Kantumruy_Pro({
  variable: "--font-kantumruy",
  subsets: ["khmer", "latin"],
  display: "swap",
});

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const viewport: Viewport = {
  themeColor: "#0a0d18",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const [{ store }, locale] = await Promise.all([getSettings(), getLocale()]);
  const description = store.tagline[locale] || store.tagline.en;
  return {
    metadataBase: new URL(siteUrl()),
    title: { default: `${store.name} — ${description}`, template: `%s | ${store.name}` },
    description,
    applicationName: store.name,
    openGraph: {
      type: "website",
      siteName: store.name,
      locale: locale === "km" ? "km_KH" : "en_US",
      description,
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  return (
    <html lang={locale} className={`${kantumruy.variable} ${chakra.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        <I18nProvider
          locale={locale}
          messages={getMessages(locale)}
          fallback={getMessages(DEFAULT_LOCALE)}
        >
          {children}
        </I18nProvider>
        <AttributionCapture />
        <TrackingScripts />
      </body>
    </html>
  );
}
