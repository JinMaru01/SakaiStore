import { FloatingChat } from "@/components/social/floating-chat";
import { supportChatLinks } from "@/components/social/social-config";
import { getT } from "@/i18n/server";
import { getSettings } from "@/lib/settings";
import { SiteFooter } from "./site-footer";
import { AnnouncementBar, SiteHeader } from "./site-header";

/**
 * Customer site chrome: announcement bar, sticky header, main, footer and the
 * floating chat button. Used by the (store) layout and the root 404 page so
 * unknown URLs still look like the store.
 */
export async function StoreShell({ children }: { children: React.ReactNode }) {
  const [settings, { t, locale }] = await Promise.all([getSettings(), getT()]);
  const chat = supportChatLinks(settings.store, settings.social);
  // Server render time; the footer year only needs to be right on the day it renders.
  const year = new Date().getUTCFullYear();

  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        {t("common.skipToContent")}
      </a>
      <AnnouncementBar settings={settings} locale={locale} />
      <SiteHeader settings={settings} t={t} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter settings={settings} t={t} year={year} />
      <FloatingChat {...chat} />
    </>
  );
}
