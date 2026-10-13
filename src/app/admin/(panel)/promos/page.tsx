import { Pencil, Plus, TicketPercent } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { ChannelBadge } from "@/components/admin/badges";
import { DataTable, EmptyState, type Column } from "@/components/admin/data-table";
import { SwitchForm } from "@/components/admin/game-controls";
import { PageHeader } from "@/components/admin/page-header";
import { FlashToast } from "@/components/admin/toast";
import { Badge, buttonClasses } from "@/components/ui";
import { flashMessage } from "@/lib/admin/flash";
import { formatDateTime } from "@/lib/admin/format";
import { describeDiscount, promoState, type PromoState } from "@/lib/admin/promo-schema";
import { listAdminPromos, type AdminPromoRow } from "@/lib/admin/promos";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { cn, formatUsd } from "@/lib/utils";
import { togglePromoAction } from "./actions";

export const metadata: Metadata = { title: "Promo codes" };

const STATE_BADGE: Record<PromoState, { label: string; className: string }> = {
  active: { label: "Live", className: "bg-success/15 text-success ring-success/30" },
  scheduled: { label: "Scheduled", className: "bg-info/15 text-info ring-info/30" },
  expired: { label: "Expired", className: "bg-muted/15 text-muted ring-muted/30" },
  used_up: { label: "Used up", className: "bg-warning/15 text-warning ring-warning/30" },
  inactive: { label: "Paused", className: "bg-muted/15 text-muted ring-muted/30" },
};

function Usage({ p }: { p: AdminPromoRow }) {
  const ratio = p.maxUses ? Math.min(1, p.usedCount / p.maxUses) : null;
  return (
    <div className="min-w-24">
      <p className="text-sm text-fg tabular-nums">
        {p.usedCount}
        <span className="text-muted"> / {p.maxUses ?? "∞"}</span>
      </p>
      {ratio != null && (
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
          <div className={cn("h-full rounded-full", ratio >= 1 ? "bg-warning" : "bg-primary")} style={{ width: `${ratio * 100}%` }} />
        </div>
      )}
    </div>
  );
}

function validity(p: AdminPromoRow): string {
  if (!p.startsAt && !p.endsAt) return "Always";
  if (p.startsAt && p.endsAt) return `${formatDateTime(p.startsAt)} → ${formatDateTime(p.endsAt)}`;
  return p.startsAt ? `From ${formatDateTime(p.startsAt)}` : `Until ${formatDateTime(p.endsAt)}`;
}

export default async function PromosPage(props: PageProps<"/admin/promos">) {
  await requireAdmin();
  const [sp, promos, settings] = await Promise.all([props.searchParams, listAdminPromos(), getSettings()]);
  const now = new Date();
  const followCode = settings.marketing.followPromoCode.trim().toUpperCase();

  const columns: Column<AdminPromoRow>[] = [
    {
      key: "code",
      header: "Code",
      cell: (p) => (
        <div>
          <Link href={`/admin/promos/${p.id}`} className="font-mono font-semibold text-fg underline-offset-4 hover:text-primary hover:underline">
            {p.code}
          </Link>
          {p.code === followCode && <p className="text-xs text-accent">Follower code</p>}
          {p.description && <p className="max-w-56 truncate text-xs text-muted">{p.description}</p>}
        </div>
      ),
    },
    {
      key: "discount",
      header: "Discount",
      cell: (p) => (
        <div className="text-sm">
          <p className="text-fg">{describeDiscount(p)}</p>
          {p.minOrderCents > 0 && <p className="text-xs text-muted">min {formatUsd(p.minOrderCents)}</p>}
        </div>
      ),
    },
    { key: "usage", header: "Used", cell: (p) => <Usage p={p} /> },
    {
      key: "scope",
      header: "Channel / game",
      cell: (p) => (
        <div className="flex flex-col items-start gap-1">
          {p.channel ? <ChannelBadge channel={p.channel} /> : <span className="text-xs text-muted">Any channel</span>}
          <span className="text-xs text-muted">{p.gameName ?? "All games"}</span>
        </div>
      ),
    },
    { key: "validity", header: "Valid", cell: (p) => <span className="text-xs text-muted">{validity(p)}</span> },
    {
      key: "state",
      header: "Status",
      cell: (p) => {
        const s = STATE_BADGE[promoState(p, now)];
        return <Badge className={s.className}>{s.label}</Badge>;
      },
    },
    {
      key: "active",
      header: <span className="sr-only">Active</span>,
      cell: (p) => (
        <div className="flex items-center justify-end gap-2">
          <SwitchForm action={togglePromoAction} fields={{ promoId: p.id }} checked={p.active} label={`Active: ${p.code}`} />
          <Link href={`/admin/promos/${p.id}`} className={buttonClasses("ghost", "icon", "h-9 w-9")} aria-label={`Edit ${p.code}`}>
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <>
      <FlashToast message={flashMessage(sp.flash)} />
      <PageHeader
        title="Promo codes"
        description="Give each channel its own code (FB5, TIKTOK5…) to see which posts bring buyers."
        actions={
          <Link href="/admin/promos/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New code
          </Link>
        }
      />

      {promos.length === 0 ? (
        <EmptyState icon={TicketPercent} title="No promo codes yet">
          Create a follower code like FOLLOW10 and advertise it on your Facebook Page and TikTok.
        </EmptyState>
      ) : (
        <>
          <DataTable className="hidden lg:block" caption="Promo codes" rows={promos} columns={columns} rowKey={(p) => p.id} />
          <ul className="grid grid-cols-1 gap-2.5 lg:hidden">
            {promos.map((p) => {
              const s = STATE_BADGE[promoState(p, now)];
              return (
                <li key={p.id} className="rounded-[var(--radius-card)] border border-border bg-surface p-3.5">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/promos/${p.id}`} className="font-mono font-semibold text-fg underline-offset-4 hover:underline">
                      {p.code}
                    </Link>
                    <Badge className={s.className}>{s.label}</Badge>
                    <span className="ml-auto">
                      <SwitchForm action={togglePromoAction} fields={{ promoId: p.id }} checked={p.active} label={`Active: ${p.code}`} />
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm text-fg">
                    {describeDiscount(p)}
                    {p.minOrderCents > 0 && <span className="text-muted"> · min {formatUsd(p.minOrderCents)}</span>}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
                    {p.channel && <ChannelBadge channel={p.channel} />}
                    <span>{p.gameName ?? "All games"}</span>
                    <span>· used {p.usedCount}/{p.maxUses ?? "∞"}</span>
                    <span>· {validity(p)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
