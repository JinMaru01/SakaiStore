"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";

export const NAV_ITEMS = [
  { href: "/#games", key: "common.nav.games", match: "/games" },
  { href: "/track", key: "common.nav.track", match: "/track" },
  { href: "/faq", key: "common.nav.faq", match: "/faq" },
] as const;

const isActive = (pathname: string, match: string) => pathname === match || pathname.startsWith(`${match}/`);

/** Desktop header navigation (md and up). */
export function DesktopNav() {
  const t = useT();
  const pathname = usePathname();
  return (
    <nav aria-label={t("common.nav.label")} className="hidden md:block">
      <ul className="flex items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(pathname, item.match);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-surface-2 text-fg" : "text-muted hover:bg-surface-2/60 hover:text-fg",
                )}
              >
                {t(item.key)}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Hamburger menu for phones. `extra` is server-rendered content (social links) shown under the links. */
export function MobileNav({ extra }: { extra?: React.ReactNode }) {
  const t = useT();
  const pathname = usePathname();
  const [openFor, setOpenFor] = useState<string | null>(null);
  const panelId = useId();
  // Closing on navigation: the menu is only "open" for the path it was opened on.
  const open = openFor === pathname;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenFor(null);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        className="grid h-10 w-10 place-items-center rounded-xl text-fg hover:bg-surface-2"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? t("common.nav.closeMenu") : t("common.nav.openMenu")}
        onClick={() => setOpenFor(open ? null : pathname)}
      >
        {open ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
      </button>
      <div
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full border-b border-border bg-bg/95 px-4 pt-2 pb-5 shadow-2xl shadow-black/40 backdrop-blur-xl"
      >
        <nav aria-label={t("common.nav.label")}>
          <ul className="grid gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(pathname, item.match);
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    onClick={() => setOpenFor(null)}
                    className={cn(
                      "flex h-12 items-center rounded-xl px-4 text-base font-medium",
                      active ? "bg-surface-2 text-fg" : "text-fg/90 hover:bg-surface-2",
                    )}
                  >
                    {t(item.key)}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
        {extra && <div className="mt-4 border-t border-border pt-4">{extra}</div>}
      </div>
    </div>
  );
}
