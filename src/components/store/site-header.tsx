import { Megaphone } from "lucide-react";
import Link from "next/link";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SocialLinks } from "@/components/social/social-links";
import type { Locale } from "@/i18n/config";
import type { TranslateFn } from "@/i18n/translate";
import type { Settings } from "@/lib/settings";
import { Logo } from "./logo";
import { DesktopNav, MobileNav } from "./nav-links";

/** Site-wide announcement (admin setting). Hidden when empty. */
export function AnnouncementBar({ settings, locale }: { settings: Settings; locale: Locale }) {
  const text = (settings.store.announcement[locale] || settings.store.announcement.en).trim();
  if (!text) return null;
  return (
    <div className="bg-brand-gradient text-white">
      <p className="mx-auto flex max-w-6xl items-center justify-center gap-2 px-4 py-2 text-center text-xs font-medium sm:text-sm">
        <Megaphone className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{text}</span>
      </p>
    </div>
  );
}

export function SiteHeader({ settings, t }: { settings: Settings; t: TranslateFn }) {
  const newTab = t("social.linkLabel");
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-bg/80 backdrop-blur-xl supports-[backdrop-filter]:bg-bg/65">
      <div className="relative mx-auto flex h-16 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link href="/" className="mr-auto rounded-lg" aria-label={`${settings.store.name} — ${t("common.nav.home")}`}>
          <Logo name={settings.store.name} />
        </Link>
        <DesktopNav />
        <SocialLinks
          social={settings.social}
          networks={["facebook", "tiktok"]}
          size="sm"
          labelTemplate={newTab}
          className="hidden lg:flex"
        />
        <LanguageSwitcher />
        <MobileNav
          extra={
            <SocialLinks social={settings.social} labelTemplate={newTab} className="justify-center" />
          }
        />
      </div>
    </header>
  );
}
