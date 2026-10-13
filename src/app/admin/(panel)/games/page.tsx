import { ExternalLink, Gamepad2, Pencil, Plus, Star } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState } from "@/components/admin/data-table";
import { GameFlagToggle, GameMoveButtons } from "@/components/admin/game-controls";
import { PageHeader } from "@/components/admin/page-header";
import { FlashToast } from "@/components/admin/toast";
import { GameArt } from "@/components/store/game-tile";
import { Badge, buttonClasses } from "@/components/ui";
import { flashMessage } from "@/lib/admin/flash";
import { listAdminGames } from "@/lib/admin/games";
import { requireAdmin } from "@/lib/auth";
import { cn, formatUsd } from "@/lib/utils";
import { moveGameAction, toggleGameFlagAction } from "./actions";

export const metadata: Metadata = { title: "Games & Prices" };

export default async function GamesPage(props: PageProps<"/admin/games">) {
  await requireAdmin();
  const [sp, games] = await Promise.all([props.searchParams, listAdminGames()]);
  const activeCount = games.filter((g) => g.active).length;

  return (
    <>
      <FlashToast message={flashMessage(sp.flash)} />
      <PageHeader
        title="Games & Prices"
        description={`${activeCount} of ${games.length} games visible in the store. The order here is the order on the home page.`}
        actions={
          <Link href="/admin/games/new" className={buttonClasses("primary", "md")}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            New game
          </Link>
        }
      />

      {games.length === 0 ? (
        <EmptyState icon={Gamepad2} title="No games yet">
          Add your first game, or run <code className="font-mono">npm run db:seed</code> to load popular Cambodian games.
        </EmptyState>
      ) : (
        <ol className="grid grid-cols-1 gap-3">
          {games.map((g, i) => (
            <li
              key={g.id}
              className={cn(
                "grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-3 rounded-[var(--radius-card)] border bg-surface p-3 sm:grid-cols-[auto_1fr_auto] sm:p-4",
                g.active ? "border-border" : "border-dashed border-border/80",
              )}
            >
              <GameArt game={g} hideCurrency sizes="64px" className={cn("w-14 sm:w-16", !g.active && "opacity-50 grayscale")} />

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/games/${g.id}`}
                    className="truncate font-semibold text-fg underline-offset-4 hover:text-primary hover:underline"
                  >
                    {g.name}
                  </Link>
                  {g.featured && (
                    <Badge className="gap-1 bg-warning/15 text-warning ring-warning/30">
                      <Star className="h-3 w-3" aria-hidden="true" />
                      Featured
                    </Badge>
                  )}
                  {!g.active && <Badge className="text-muted">Hidden</Badge>}
                </div>
                <p className="mt-0.5 truncate font-mono text-xs text-muted">/games/{g.slug}</p>
                <p className="mt-1 text-sm text-muted">
                  {g.activePackageCount} active package{g.activePackageCount === 1 ? "" : "s"}
                  {g.packageCount > g.activePackageCount && ` (+${g.packageCount - g.activePackageCount} hidden)`}
                  {" · "}
                  {g.minPriceCents != null ? (
                    <span className="text-fg">from {formatUsd(g.minPriceCents)}</span>
                  ) : (
                    <span className="text-warning">no active packages</span>
                  )}
                </p>
              </div>

              <div className="col-span-2 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border/60 pt-3 sm:col-span-1 sm:border-0 sm:pt-0">
                <div className="flex items-center gap-2 text-sm">
                  <GameFlagToggle action={toggleGameFlagAction} gameId={g.id} flag="active" checked={g.active} gameName={g.name} />
                  <span className="text-muted" aria-hidden="true">
                    Active
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <GameFlagToggle action={toggleGameFlagAction} gameId={g.id} flag="featured" checked={g.featured} gameName={g.name} />
                  <span className="text-muted" aria-hidden="true">
                    Featured
                  </span>
                </div>
                <div className="flex items-center gap-1" title={`Sort order ${g.sortOrder}`}>
                  <span className="sr-only">Position {i + 1}</span>
                  <GameMoveButtons
                    action={moveGameAction}
                    gameId={g.id}
                    gameName={g.name}
                    first={i === 0}
                    last={i === games.length - 1}
                  />
                </div>
                <div className="ml-auto flex items-center gap-1 sm:ml-0">
                  {g.active && (
                    <a
                      href={`/games/${g.slug}`}
                      target="_blank"
                      rel="noopener"
                      className={buttonClasses("ghost", "icon", "h-9 w-9")}
                      aria-label={`View ${g.name} in the store (opens in a new tab)`}
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  )}
                  <Link href={`/admin/games/${g.id}`} className={buttonClasses("secondary", "sm")}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
