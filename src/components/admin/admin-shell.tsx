"use client";

import {
  ExternalLink,
  Gamepad2,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShoppingBag,
  TicketPercent,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { LogoMark } from "@/components/store/logo";
import { NEEDS_ACTION_STATUSES } from "@/lib/admin/order-filters";
import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Exact match only (the dashboard would otherwise match every admin path). */
  exact?: boolean;
  badge?: number;
};

const ORDERS_NEEDING_ACTION_HREF = `/admin/orders?${NEEDS_ACTION_STATUSES.map((s) => `status=${s}`).join("&")}`;

function isActive(pathname: string, item: NavItem) {
  return item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
}

type Props = {
  storeName: string;
  /** Orders paid/processing/failed — shown as a badge on Orders. */
  needsAction: number;
  logoutAction: () => Promise<void>;
  children: React.ReactNode;
};

/**
 * Admin chrome: fixed sidebar on desktop (lg+), sticky top bar with a
 * slide-over menu on phones (where the owner usually works from).
 */
export function AdminShell({ storeName, needsAction, logoutAction, children }: Props) {
  // usePathname() can be null before the router is ready; treat that as "no active item".
  const pathname = usePathname() ?? "";
  const [openFor, setOpenFor] = useState<string | null>(null);
  // The menu only stays open on the path it was opened on, so navigating closes it.
  const open = openFor === pathname;
  const menuButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const items: NavItem[] = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag, badge: needsAction },
    { href: "/admin/games", label: "Games & Prices", icon: Gamepad2 },
    { href: "/admin/promos", label: "Promo codes", icon: TicketPercent },
    { href: "/admin/marketing", label: "Marketing", icon: Megaphone },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ];

  useEffect(() => {
    if (!open) return;
    const button = menuButton.current;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpenFor(null);
      // Keep keyboard focus inside the dialog while it is open.
      if (e.key === "Tab" && panel.current) {
        const focusable = panel.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])");
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel.current?.querySelector<HTMLElement>("a[href]")?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      button?.focus();
    };
  }, [open]);

  const nav = (
    <NavList
      items={items}
      pathname={pathname}
      logoutAction={logoutAction}
      onNavigate={() => setOpenFor(null)}
    />
  );

  return (
    <div className="flex min-h-dvh flex-1 flex-col lg:flex-row">
      <a
        href="#admin-main"
        className="sr-only z-[70] rounded-lg bg-primary px-4 py-2 text-primary-fg focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <Brand storeName={storeName} />
        {nav}
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-bg/85 px-3 backdrop-blur-xl lg:hidden">
        <button
          ref={menuButton}
          type="button"
          className="relative grid h-10 w-10 place-items-center rounded-xl text-fg hover:bg-surface-2"
          aria-expanded={open}
          aria-controls="admin-mobile-nav"
          aria-label="Open menu"
          onClick={() => setOpenFor(pathname)}
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
          {needsAction > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 rounded-full bg-warning ring-2 ring-bg" aria-hidden="true" />
          )}
        </button>
        <Link href="/admin" className="flex min-w-0 items-center gap-2 rounded-lg">
          <LogoMark className="h-7 w-7" />
          <span className="truncate font-display font-semibold">{storeName} Admin</span>
        </Link>
        {needsAction > 0 && (
          <Link
            href={ORDERS_NEEDING_ACTION_HREF}
            className="ml-auto inline-flex h-9 items-center gap-1.5 rounded-xl bg-warning/15 px-3 text-sm font-semibold text-warning ring-1 ring-warning/30 ring-inset"
            aria-label={`${needsAction} orders need action`}
          >
            <ShoppingBag className="h-4 w-4" aria-hidden="true" />
            {needsAction > 99 ? "99+" : needsAction}
          </Link>
        )}
      </header>

      {/* Mobile slide-over */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            tabIndex={-1}
            aria-hidden="true"
            className="absolute inset-0 h-full w-full cursor-default bg-black/60 backdrop-blur-sm"
            onClick={() => setOpenFor(null)}
          />
          <div
            id="admin-mobile-nav"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute inset-y-0 left-0 flex w-[min(20rem,85vw)] flex-col border-r border-border bg-surface shadow-2xl shadow-black/60"
          >
            <div className="flex items-center justify-between pr-3">
              <Brand storeName={storeName} />
              <button
                type="button"
                onClick={() => setOpenFor(null)}
                className="grid h-10 w-10 place-items-center rounded-xl text-fg hover:bg-surface-2"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            {nav}
          </div>
        </div>
      )}

      <main id="admin-main" className="min-w-0 flex-1 px-4 pt-5 pb-24 sm:px-6 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-6xl">{children}</div>
      </main>
    </div>
  );
}

function Brand({ storeName }: { storeName: string }) {
  return (
    <Link href="/admin" className="flex h-16 items-center gap-2.5 rounded-lg px-5">
      <LogoMark className="h-8 w-8" />
      <span className="min-w-0">
        <span className="block truncate font-display text-base leading-tight font-bold">{storeName}</span>
        <span className="block text-xs text-muted">Admin</span>
      </span>
    </Link>
  );
}

function NavList({
  items,
  pathname,
  logoutAction,
  onNavigate,
}: {
  items: NavItem[];
  pathname: string;
  logoutAction: () => Promise<void>;
  onNavigate: () => void;
}) {
  const linkClass = (active: boolean) =>
    cn(
      "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
      active ? "bg-primary/15 text-fg ring-1 ring-primary/30 ring-inset" : "text-muted hover:bg-surface-2 hover:text-fg",
    );

  return (
    <nav aria-label="Admin" className="flex min-h-0 flex-1 flex-col overflow-y-auto px-3 pb-4">
      <ul className="grid grid-cols-1 gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item);
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
                className={linkClass(active)}
              >
                <Icon className={cn("h-[18px] w-[18px] shrink-0", active && "text-primary")} aria-hidden />
                <span className="flex-1">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span className="min-w-6 rounded-full bg-warning px-1.5 py-0.5 text-center text-xs font-bold text-bg">
                    <span className="sr-only">, </span>
                    {item.badge > 99 ? "99+" : item.badge}
                    <span className="sr-only"> need action</span>
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
      <ul className="mt-auto grid grid-cols-1 gap-1 border-t border-border pt-3">
        <li>
          <a href="/" target="_blank" rel="noopener" className={linkClass(false)}>
            <ExternalLink className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
            <span className="flex-1">View store</span>
            <span aria-hidden="true">↗</span>
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        </li>
        <li>
          <form action={logoutAction}>
            <button type="submit" className={cn(linkClass(false), "w-full")}>
              <LogOut className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1 text-left">Log out</span>
            </button>
          </form>
        </li>
      </ul>
    </nav>
  );
}
