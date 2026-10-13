import { safeHex, shade } from "@/components/store/game-art";
import { isOnSale, pickHighlightPackages, pickListPackages, type PromoPackage } from "@/lib/marketing/packages";
import { latinText, truncate } from "@/lib/marketing/og-text";
import { PROMO_FORMATS, type PromoFormat } from "@/lib/marketing/promo-formats";
import { formatUsd } from "@/lib/utils";
import { Backdrop, BoltIcon, Chip, GameTile, GemMark, OG, OG_FONT_STACK, QrIcon, rgba, ShieldIcon } from "./primitives";

/**
 * Bold price-list posters for posting on Facebook / TikTok (admin downloads
 * them from the Marketing studio). Story layouts keep content inside the
 * area TikTok / Reels leave uncovered (top bar, right-hand buttons, caption).
 */

export type PosterGame = {
  name: string;
  currencyName: string;
  accentColor: string;
  minPriceCents: number | null;
  packages: PromoPackage[];
};

/** Promo callout; only codes that are live right now are passed in. */
export type PosterPromo = { code: string; headline: string; conditions: string } | null;

type Layout = {
  padX: number;
  padTop: number;
  padBottom: number;
  header: number;
  gap: number;
  tile: number;
  name: number;
  rowH: number;
  rowFont: number;
  priceFont: number;
  /** Price rows without / with a promo code callout (the trust strip is smaller). */
  rows: [number, number];
  /** All-games cards without / with a promo callout. */
  cards: [number, number];
};

const LAYOUTS: Record<PromoFormat, Layout> = {
  square: { padX: 64, padTop: 56, padBottom: 56, header: 60, gap: 28, tile: 168, name: 58, rowH: 58, rowFont: 30, priceFont: 34, rows: [6, 5], cards: [4, 4] },
  portrait: { padX: 72, padTop: 64, padBottom: 64, header: 64, gap: 30, tile: 196, name: 64, rowH: 64, rowFont: 32, priceFont: 38, rows: [9, 8], cards: [6, 6] },
  story: { padX: 84, padTop: 170, padBottom: 300, header: 72, gap: 34, tile: 230, name: 72, rowH: 70, rowFont: 34, priceFont: 42, rows: [8, 8], cards: [8, 8] },
};

export function posterRowCount(format: PromoFormat, hasPromo: boolean): number {
  return LAYOUTS[format].rows[hasPromo ? 1 : 0];
}

export function posterCardCount(format: PromoFormat, hasPromo: boolean): number {
  return LAYOUTS[format].cards[hasPromo ? 1 : 0];
}

const BADGES: Record<string, { label: string; color: string }> = {
  hot: { label: "HOT", color: "#ff5a3c" },
  best: { label: "BEST", color: OG.success },
  new: { label: "NEW", color: OG.accent },
  promo: { label: "SALE", color: OG.warning },
  sale: { label: "SALE", color: OG.warning },
};

function Badge({ badge, size }: { badge: string | null | undefined; size: number }) {
  const b = BADGES[(badge ?? "").trim().toLowerCase()];
  if (!b) return null;
  return (
    <div
      style={{
        display: "flex",
        padding: `${size * 0.12}px ${size * 0.4}px`,
        borderRadius: size,
        backgroundColor: rgba(b.color, 0.18),
        border: `2px solid ${rgba(b.color, 0.6)}`,
        color: b.color,
        fontSize: size * 0.62,
        fontWeight: 700,
        letterSpacing: 2,
      }}
    >
      {b.label}
    </div>
  );
}

function Header({ storeName, l, right }: { storeName: string; l: Layout; right?: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: l.header }}>
      <div style={{ display: "flex", alignItems: "center", gap: l.header * 0.3 }}>
        <GemMark size={l.header} />
        <div style={{ display: "flex", fontSize: l.header * 0.62, fontWeight: 700, letterSpacing: -0.5 }}>
          {truncate(latinText(storeName, "Sakai Store"), 24)}
        </div>
      </div>
      {right && (
        <div
          style={{
            display: "flex",
            padding: `${l.header * 0.14}px ${l.header * 0.34}px`,
            borderRadius: l.header,
            border: "2px solid rgba(255,255,255,0.18)",
            fontSize: l.header * 0.34,
            fontWeight: 700,
            letterSpacing: 3,
            color: OG.muted,
          }}
        >
          {right}
        </div>
      )}
    </div>
  );
}

function PromoCallout({ promo, l, format }: { promo: NonNullable<PosterPromo>; l: Layout; format: PromoFormat }) {
  const big = format === "story" ? 1.15 : 1;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 24,
        padding: `${26 * big}px ${34 * big}px`,
        borderRadius: 30,
        backgroundImage: `linear-gradient(120deg, ${OG.primary} 0%, #4f7cff 55%, ${OG.accent} 100%)`,
        boxShadow: `0 16px 40px ${rgba(OG.primary, 0.45)}`,
        marginTop: l.gap,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", fontSize: 22 * big, fontWeight: 700, letterSpacing: 4, color: "rgba(255,255,255,0.85)" }}>USE CODE</div>
        <div style={{ display: "flex", fontSize: 58 * big, fontWeight: 700, letterSpacing: 6, color: "#fff", lineHeight: 1.05 }}>
          {truncate(latinText(promo.code), 14)}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
        <div style={{ display: "flex", fontSize: 54 * big, fontWeight: 700, color: "#fff", lineHeight: 1.05 }}>
          {latinText(promo.headline, "EXTRA OFF")}
        </div>
        {promo.conditions && (
          <div style={{ display: "flex", fontSize: 22 * big, fontWeight: 600, color: "rgba(255,255,255,0.9)" }}>
            {truncate(latinText(promo.conditions), 40)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Shown in the promo slot when no live code is advertised: the three reasons to buy here. */
function TrustCallout({ l, format }: { l: Layout; format: PromoFormat }) {
  const size = format === "story" ? 30 : 26;
  const items = [
    { icon: <ShieldIcon size={size * 1.4} />, title: "No password", sub: "We only need your ID" },
    { icon: <BoltIcon size={size * 1.4} />, title: "Fast delivery", sub: "Minutes after paying" },
    { icon: <QrIcon size={size * 1.4} color={OG.accent} />, title: "KHQR", sub: "ABA · ACLEDA · Wing" },
  ];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        marginTop: l.gap,
        padding: `${size * 0.9}px ${size}px`,
        borderRadius: 30,
        backgroundColor: "rgba(255,255,255,0.05)",
        border: "2px solid rgba(255,255,255,0.12)",
      }}
    >
      {items.map((it) => (
        <div key={it.title} style={{ display: "flex", alignItems: "center", gap: size * 0.5 }}>
          {it.icon}
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", fontSize: size, fontWeight: 700 }}>{it.title}</div>
            <div style={{ display: "flex", fontSize: size * 0.68, color: OG.muted, fontWeight: 600 }}>{it.sub}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function Footer({ host, l, format }: { host: string; l: Layout; format: PromoFormat }) {
  const site = truncate(latinText(host, "sakaistore.com"), 32);
  const chipFont = format === "story" ? 30 : 26;
  const chips = (
    <div style={{ display: "flex", gap: 14 }}>
      <Chip icon={<QrIcon size={chipFont * 1.1} />} label="Pay with KHQR" fontSize={chipFont} background={rgba(OG.khqr, 0.88)} />
      <Chip icon={<BoltIcon size={chipFont * 1.1} />} label="Instant delivery" fontSize={chipFont} />
    </div>
  );
  if (format === "story") {
    return (
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22, marginTop: "auto", paddingTop: l.gap }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, fontSize: 46, fontWeight: 700, color: OG.accent }}>
          <ShieldIcon size={44} color={OG.accent} />
          <div style={{ display: "flex" }}>{site}</div>
        </div>
        {chips}
      </div>
    );
  }
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "auto", paddingTop: l.gap * 0.6 }}>
      {chips}
      <div style={{ display: "flex", fontSize: format === "square" ? 30 : 34, fontWeight: 700, color: OG.accent }}>{site}</div>
    </div>
  );
}

function Frame({ format, accent, children }: { format: PromoFormat; accent: string; children: React.ReactNode }) {
  const l = LAYOUTS[format];
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        position: "relative",
        fontFamily: OG_FONT_STACK,
        color: OG.fg,
      }}
    >
      <Backdrop accent={accent} glow={0.55} />
      <div
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          padding: `${l.padTop}px ${l.padX}px ${l.padBottom}px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}

type PosterBase = { format: PromoFormat; storeName: string; host: string; promo: PosterPromo };

/** One game: generated tile, name, "from $x", price list, promo code, KHQR + website. */
export function GamePoster({ format, storeName, host, promo, game }: PosterBase & { game: PosterGame }) {
  const l = LAYOUTS[format];
  const accent = safeHex(game.accentColor);
  const name = truncate(latinText(game.name, "Game top-up"), 34);
  const nameSize = name.length <= 14 ? l.name : name.length <= 24 ? l.name * 0.86 : l.name * 0.72;
  const paid = game.packages.filter((p) => p.priceCents > 0);
  const rows = pickListPackages(paid, posterRowCount(format, !!promo));
  const more = paid.length - rows.length;
  return (
    <Frame format={format} accent={accent}>
      <Header storeName={storeName} l={l} right="PRICE LIST" />

      <div style={{ display: "flex", alignItems: "center", gap: l.gap, marginTop: l.gap }}>
        <GameTile name={game.name} currencyName={game.currencyName} accentColor={accent} size={l.tile} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", fontSize: l.name * 0.36, fontWeight: 700, letterSpacing: 4, color: shade(accent, 0.45), textTransform: "uppercase" }}>
            {`${truncate(latinText(game.currencyName, "Top-up"), 22)} top-up`}
          </div>
          <div style={{ display: "flex", fontSize: nameSize, fontWeight: 700, lineHeight: 1.04, letterSpacing: -1, marginTop: 4 }}>{name}</div>
          {game.minPriceCents != null && (
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 8 }}>
              <div style={{ display: "flex", fontSize: l.name * 0.45, color: OG.muted, fontWeight: 600 }}>from</div>
              <div style={{ display: "flex", fontSize: l.name * 0.8, fontWeight: 700, color: OG.accent }}>{formatUsd(game.minPriceCents)}</div>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          marginTop: l.gap,
          padding: 20,
          borderRadius: 30,
          backgroundColor: "rgba(17,22,40,0.82)",
          border: `2px solid ${rgba(accent, 0.35)}`,
        }}
      >
        {rows.map((p, i) => (
          <div
            key={`${p.name}-${i}`}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              height: l.rowH,
              padding: "0 22px",
              borderRadius: 18,
              backgroundColor: i % 2 === 0 ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.025)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <div style={{ display: "flex", fontSize: l.rowFont, fontWeight: 600 }}>{truncate(latinText(p.name, "Package"), 26)}</div>
              <Badge badge={p.badge} size={l.rowFont * 0.9} />
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 12 }}>
              {isOnSale(p) && (
                <div style={{ display: "flex", fontSize: l.rowFont * 0.75, color: OG.muted, textDecoration: "line-through" }}>
                  {formatUsd(p.compareAtCents!)}
                </div>
              )}
              <div style={{ display: "flex", fontSize: l.priceFont, fontWeight: 700, color: "#fff" }}>{formatUsd(p.priceCents)}</div>
            </div>
          </div>
        ))}
        {more > 0 && (
          <div style={{ display: "flex", justifyContent: "center", fontSize: l.rowFont * 0.75, color: OG.muted, paddingTop: 4 }}>
            {`+ ${more} more package${more === 1 ? "" : "s"} on our website`}
          </div>
        )}
      </div>

      {promo ? <PromoCallout promo={promo} l={l} format={format} /> : <TrustCallout l={l} format={format} />}
      <Footer host={host} l={l} format={format} />
    </Frame>
  );
}

/** Every featured game: tile, name, "from $x" and two packages each. */
export function AllGamesPoster({ format, storeName, host, promo, games }: PosterBase & { games: PosterGame[] }) {
  const l = LAYOUTS[format];
  const { width } = PROMO_FORMATS[format];
  const cardGap = 20;
  const cardW = Math.floor((width - l.padX * 2 - cardGap) / 2);
  const tile = format === "story" ? 96 : 84;
  const cards = games.slice(0, posterCardCount(format, !!promo));
  const title = format === "story" ? 84 : format === "portrait" ? 76 : 66;
  return (
    <Frame format={format} accent={OG.primary}>
      <Header storeName={storeName} l={l} right="TOP-UP" />

      <div style={{ display: "flex", flexDirection: "column", marginTop: l.gap }}>
        <div style={{ display: "flex", fontSize: title * 0.32, fontWeight: 700, letterSpacing: 5, color: OG.accent }}>GAME TOP-UP IN CAMBODIA</div>
        <div style={{ display: "flex", fontSize: title, fontWeight: 700, letterSpacing: -1.5, lineHeight: 1.05 }}>Price list</div>
        <div style={{ display: "flex", fontSize: title * 0.36, color: OG.muted, fontWeight: 600, marginTop: 6 }}>
          Cheap · Fast · Safe — no password needed
        </div>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: cardGap, marginTop: l.gap }}>
        {cards.map((g, i) => {
          const accent = safeHex(g.accentColor);
          const pkgs = pickHighlightPackages(g.packages, 2);
          return (
            <div
              key={`${g.name}-${i}`}
              style={{
                display: "flex",
                flexDirection: "column",
                width: cardW,
                padding: 18,
                gap: 10,
                borderRadius: 26,
                backgroundColor: "rgba(17,22,40,0.85)",
                border: `2px solid ${rgba(accent, 0.4)}`,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                <GameTile name={g.name} currencyName={g.currencyName} accentColor={accent} size={tile} showCurrency={false} />
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", fontSize: 27, fontWeight: 700, lineHeight: 1.1 }}>
                    {truncate(latinText(g.name.split(/[:|]/)[0] ?? g.name, "Game"), 20)}
                  </div>
                  {g.minPriceCents != null && (
                    <div style={{ display: "flex", fontSize: 24, fontWeight: 700, color: OG.accent, marginTop: 2 }}>
                      {`from ${formatUsd(g.minPriceCents)}`}
                    </div>
                  )}
                </div>
              </div>
              {pkgs.map((p, j) => (
                <div
                  key={`${p.name}-${j}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 12px",
                    borderRadius: 12,
                    backgroundColor: "rgba(255,255,255,0.05)",
                  }}
                >
                  <div style={{ display: "flex", fontSize: 22, fontWeight: 600, color: OG.fg }}>{truncate(latinText(p.name, "Package"), 20)}</div>
                  <div style={{ display: "flex", fontSize: 24, fontWeight: 700 }}>{formatUsd(p.priceCents)}</div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {promo ? <PromoCallout promo={promo} l={l} format={format} /> : <TrustCallout l={l} format={format} />}
      <Footer host={host} l={l} format={format} />
    </Frame>
  );
}
