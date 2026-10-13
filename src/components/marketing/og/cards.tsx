import { safeHex, shade } from "@/components/store/game-art";
import { isOnSale, type PromoPackage } from "@/lib/marketing/packages";
import { latinText, truncate } from "@/lib/marketing/og-text";
import { formatUsd } from "@/lib/utils";
import { Backdrop, BoltIcon, Chip, GameTile, GemMark, OG, OG_FONT_STACK, QrIcon, rgba } from "./primitives";

/** Open Graph cards (1200×630) shown when links are shared on Facebook, Messenger, Telegram, TikTok bio… */

export const OG_SIZE = { width: 1200, height: 630 } as const;

export type OgTileGame = { name: string; currencyName: string; accentColor: string };

function taglineSize(text: string): number {
  if (text.length <= 34) return 66;
  if (text.length <= 56) return 56;
  return 46;
}

/** Site-wide card: store name, tagline, a row of game tiles, KHQR + delivery promise. */
export function SiteOgCard({
  storeName,
  tagline,
  games,
  host,
}: {
  storeName: string;
  tagline: string;
  games: OgTileGame[];
  host: string;
}) {
  const name = truncate(latinText(storeName, "Sakai Store"), 28);
  const line = truncate(latinText(tagline, "Fast & cheap game top-up in Cambodia"), 84);
  const tiles = games.slice(0, 6);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: OG_FONT_STACK, color: OG.fg }}>
      <Backdrop />
      <div style={{ position: "relative", display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "52px 64px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <GemMark size={64} />
          <div style={{ display: "flex", fontSize: 40, fontWeight: 700, letterSpacing: -0.5 }}>{name}</div>
        </div>

        <div
          style={{
            display: "flex",
            marginTop: 30,
            maxWidth: 1040,
            fontSize: taglineSize(line),
            fontWeight: 700,
            lineHeight: 1.12,
            letterSpacing: -1,
          }}
        >
          {line}
        </div>

        <div style={{ display: "flex", gap: 22, marginTop: "auto", marginBottom: 30 }}>
          {tiles.map((g, i) => (
            <div key={`${g.name}-${i}`} style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 132, gap: 10 }}>
              <GameTile name={g.name} currencyName={g.currencyName} accentColor={g.accentColor} size={124} showCurrency={false} />
              <div style={{ display: "flex", fontSize: 18, fontWeight: 600, color: OG.muted, maxWidth: 132, textAlign: "center" }}>
                {truncate(latinText(g.name.split(/[:|]/)[0] ?? g.name, "Game"), 16)}
              </div>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", gap: 14 }}>
            <Chip icon={<QrIcon size={26} />} label="Pay with KHQR" fontSize={24} background={rgba(OG.khqr, 0.85)} />
            <Chip icon={<BoltIcon size={26} />} label="Instant delivery" fontSize={24} />
          </div>
          <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: OG.accent }}>{truncate(latinText(host), 36)}</div>
        </div>
      </div>
    </div>
  );
}

export type OgGame = { name: string; currencyName: string; accentColor: string; publisher?: string | null };

/** Per-game card: big generated tile in the game's accent, name, "from $x", best packages. */
export function GameOgCard({
  game,
  minPriceCents,
  packages,
  storeName,
  host,
}: {
  game: OgGame;
  minPriceCents: number | null;
  packages: PromoPackage[];
  storeName: string;
  host: string;
}) {
  const accent = safeHex(game.accentColor);
  const name = truncate(latinText(game.name, "Game top-up"), 40);
  const currency = truncate(latinText(game.currencyName, "Top-up"), 22);
  const nameSize = name.length <= 16 ? 64 : name.length <= 26 ? 54 : 44;
  const rows = packages.slice(0, 4);
  return (
    <div style={{ width: "100%", height: "100%", display: "flex", position: "relative", fontFamily: OG_FONT_STACK, color: OG.fg }}>
      <Backdrop accent={accent} glow={0.5} />
      <div style={{ position: "relative", display: "flex", width: "100%", height: "100%", padding: "48px 60px", gap: 52 }}>
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", width: 380 }}>
          <div style={{ display: "flex", transform: "rotate(-4deg)" }}>
            <GameTile name={game.name} currencyName={game.currencyName} accentColor={accent} size={360} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: 22, fontWeight: 700, letterSpacing: 4, color: shade(accent, 0.45), textTransform: "uppercase" }}>
            {`${currency} top-up`}
          </div>
          <div style={{ display: "flex", marginTop: 8, fontSize: nameSize, fontWeight: 700, lineHeight: 1.05, letterSpacing: -1 }}>{name}</div>
          {minPriceCents != null && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 14 }}>
              <div style={{ display: "flex", fontSize: 30, color: OG.muted, fontWeight: 600 }}>from</div>
              <div style={{ display: "flex", fontSize: 64, fontWeight: 700, color: "#fff" }}>{formatUsd(minPriceCents)}</div>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
            {rows.map((p, i) => (
              <div
                key={`${p.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "9px 18px",
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  border: `1px solid ${i === 0 ? rgba(accent, 0.55) : "rgba(255,255,255,0.1)"}`,
                }}
              >
                <div style={{ display: "flex", fontSize: 24, fontWeight: 600 }}>{truncate(latinText(p.name, "Package"), 30)}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
                  {isOnSale(p) && (
                    <div style={{ display: "flex", fontSize: 18, color: OG.muted, textDecoration: "line-through" }}>
                      {formatUsd(p.compareAtCents!)}
                    </div>
                  )}
                  <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>{formatUsd(p.priceCents)}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: "auto" }}>
            <GemMark size={40} />
            <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>{truncate(latinText(storeName, "Sakai Store"), 24)}</div>
            <div style={{ display: "flex", fontSize: 22, color: OG.muted }}>{`· Pay with KHQR · ${truncate(latinText(host), 28)}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
