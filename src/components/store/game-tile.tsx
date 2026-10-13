import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { cn, formatUsd } from "@/lib/utils";
import { gameInitials, isRenderableImageUrl, safeHex, shade, withAlpha } from "./game-art";

/** The subset of a game the tiles need (keeps client payloads small). */
export type TileGame = {
  slug: string;
  name: string;
  currencyName: string;
  accentColor: string;
  imageUrl: string | null;
  publisher?: string | null;
  tagline?: string | null;
  minPriceCents?: number | null;
};

type ArtProps = {
  game: Pick<TileGame, "name" | "currencyName" | "accentColor" | "imageUrl">;
  className?: string;
  /** next/image sizes hint, e.g. "(min-width: 1024px) 200px, 33vw" */
  sizes?: string;
  priority?: boolean;
  /** Hide the currency label (tiny placements). */
  hideCurrency?: boolean;
};

/**
 * Square game artwork. Uses the admin-provided image when set; otherwise a
 * generated tile (accent gradient + monogram + currency name + subtle
 * pattern), because official game logos are trademarks we must not hotlink.
 * Decorative: the game name is always rendered as text next to it.
 */
export function GameArt({ game, className, sizes = "(min-width: 1024px) 220px, 40vw", priority, hideCurrency }: ArtProps) {
  const base = "@container relative aspect-square overflow-hidden rounded-2xl";
  if (isRenderableImageUrl(game.imageUrl)) {
    return (
      <div className={cn(base, "bg-surface-2", className)}>
        <Image
          src={game.imageUrl}
          alt=""
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover"
        />
      </div>
    );
  }

  const accent = safeHex(game.accentColor);
  const initials = gameInitials(game.name);
  const monogramSize = initials.length <= 2 ? "text-[30cqw]" : initials.length === 3 ? "text-[26cqw]" : "text-[21cqw]";
  return (
    <div
      aria-hidden="true"
      className={cn(base, "isolate", className)}
      style={{
        backgroundImage: `linear-gradient(150deg, ${shade(accent, 0.18)} 0%, ${accent} 42%, ${shade(accent, -0.62)} 100%)`,
      }}
    >
      {/* dotted texture fading towards the bottom */}
      <div
        aria-hidden="true"
        className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgb(255_255_255/0.22)_1px,transparent_1.3px)] [background-size:11px_11px] [mask-image:linear-gradient(to_bottom,black,transparent_75%)]"
      />
      {/* diagonal light streaks */}
      <div
        aria-hidden="true"
        className="absolute inset-0 [background-image:repeating-linear-gradient(135deg,rgb(255_255_255/0.07)_0_2px,transparent_2px_16px)]"
      />
      <div
        aria-hidden="true"
        className="absolute -top-1/4 -right-1/4 h-3/4 w-3/4 rounded-full bg-white/25 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-1/2"
        style={{ backgroundImage: `linear-gradient(to top, ${withAlpha(shade(accent, -0.8), 0.85)}, transparent)` }}
      />
      <span
        aria-hidden="true"
        className={cn(
          "absolute inset-0 grid place-items-center pb-[8cqw] font-display leading-none font-bold tracking-tight text-white [text-shadow:0_4px_18px_rgb(0_0_0/0.35)]",
          monogramSize,
        )}
      >
        {initials}
      </span>
      {!hideCurrency && (
        <span
          aria-hidden="true"
          className="absolute bottom-[6cqw] left-1/2 max-w-[86%] -translate-x-1/2 truncate rounded-full bg-black/35 px-[5cqw] py-[1.5cqw] text-[clamp(9px,7.5cqw,14px)] leading-tight font-semibold text-white/95 ring-1 ring-white/20 backdrop-blur-sm"
        >
          {game.currencyName}
        </span>
      )}
      <div aria-hidden="true" className="absolute inset-0 rounded-2xl ring-1 ring-white/15 ring-inset" />
    </div>
  );
}

type TileProps = {
  game: TileGame;
  /** Translated "from {price}" template; {price} is replaced. */
  fromLabel: string;
  /** Translated CTA shown on featured cards. */
  ctaLabel?: string;
  variant?: "compact" | "featured";
  priority?: boolean;
};

/** Clickable game card with "from $x" price. */
export function GameTile({ game, fromLabel, ctaLabel, variant = "compact", priority }: TileProps) {
  const featured = variant === "featured";
  const price = game.minPriceCents != null ? fromLabel.replace("{price}", formatUsd(game.minPriceCents)) : null;
  const glow = { "--tile-glow": withAlpha(safeHex(game.accentColor), 0.65) } as React.CSSProperties;
  return (
    <Link
      href={`/games/${game.slug}`}
      style={glow}
      className={cn(
        "group block h-full rounded-[var(--radius-card)] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0",
        featured && "border border-border bg-surface p-2.5 hover:border-primary/60 sm:p-3",
      )}
    >
      <div className="relative">
        <GameArt
          game={game}
          priority={priority}
          sizes={featured ? "(min-width: 1024px) 260px, 45vw" : "(min-width: 1024px) 170px, 30vw"}
          className="transition-shadow duration-200 group-hover:shadow-[0_12px_32px_-12px_var(--tile-glow)]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-transparent transition group-hover:ring-primary/70 group-focus-visible:ring-accent"
        />
      </div>
      <div className={cn(featured ? "px-1 pt-3 pb-1" : "px-0.5 pt-2.5")}>
        <h3
          className={cn(
            "line-clamp-2 font-semibold leading-snug text-fg",
            featured ? "text-sm sm:text-base" : "text-[13px] sm:text-sm",
          )}
        >
          {game.name}
        </h3>
        {featured && game.tagline && (
          <p className="mt-0.5 line-clamp-1 text-xs text-muted sm:text-sm">{game.tagline}</p>
        )}
        <div className={cn("flex items-center justify-between gap-2", featured ? "mt-2.5" : "mt-1")}>
          {price && <p className={cn("text-accent", featured ? "text-sm font-semibold" : "text-xs")}>{price}</p>}
          {featured && ctaLabel && (
            <span className="hidden items-center gap-1 text-xs font-semibold text-primary transition-colors group-hover:text-fg sm:inline-flex">
              {ctaLabel}
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
