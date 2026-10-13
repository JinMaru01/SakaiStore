import { LayoutGrid } from "lucide-react";
import Link from "next/link";
import { GameArt } from "@/components/store/game-tile";
import { cn } from "@/lib/utils";

export type PickerGame = {
  slug: string;
  name: string;
  currencyName: string;
  accentColor: string;
  imageUrl: string | null;
  active: boolean;
  packageCount: number;
};

/** Studio URL keeping the other query params. */
export function studioHref(params: { game?: string | null; days?: number }): string {
  const q = new URLSearchParams();
  if (params.game) q.set("game", params.game);
  if (params.days && params.days !== 30) q.set("days", String(params.days));
  const s = q.toString();
  return s ? `/admin/marketing?${s}` : "/admin/marketing";
}

const CHIP =
  "flex h-11 shrink-0 items-center gap-2 rounded-xl border px-2.5 pr-3.5 text-sm font-medium whitespace-nowrap transition-colors";

/** "All games" + one chip per game; scrolls sideways on phones. */
export function GamePicker({ games, selected, days }: { games: PickerGame[]; selected: string | null; days: number }) {
  const chip = (active: boolean) =>
    cn(CHIP, active ? "border-primary bg-primary/15 text-fg" : "border-border bg-surface text-muted hover:border-primary/60 hover:text-fg");
  return (
    <nav aria-label="Choose a game to promote" className="-mx-4 sm:mx-0">
      <ul className="relative flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:thin] sm:flex-wrap sm:px-0">
        <li>
          <Link href={studioHref({ days })} scroll={false} aria-current={selected === null ? "page" : undefined} className={chip(selected === null)}>
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-brand-gradient text-white">
              <LayoutGrid className="h-4 w-4" aria-hidden="true" />
            </span>
            All games
          </Link>
        </li>
        {games.map((g) => (
          <li key={g.slug}>
            <Link
              href={studioHref({ game: g.slug, days })}
              scroll={false}
              aria-current={selected === g.slug ? "page" : undefined}
              className={chip(selected === g.slug)}
            >
              <GameArt game={g} hideCurrency sizes="28px" className="w-7 rounded-lg" />
              <span>{g.name}</span>
              {!g.active && <span className="text-xs text-warning">(hidden)</span>}
              {g.packageCount === 0 && <span className="text-xs text-danger">(no prices)</span>}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
