import { gameInitials, safeHex, shade } from "@/components/store/game-art";
import { latinText } from "@/lib/marketing/og-text";

/*
 * Satori building blocks (inline styles only, flexbox only). Every element
 * with more than one child must be display:flex, and text is passed as one
 * template string so it stays a single child.
 */

/** Font family registered by renderPng (./render.tsx). */
export const OG_FONT = "Kantumruy Pro";
export const OG_FONT_STACK = OG_FONT;

export const OG = {
  bg: "#0a0d18",
  surface: "#111628",
  surface2: "#182038",
  border: "#263152",
  fg: "#e8ebf5",
  muted: "#8d96b0",
  primary: "#7c5cff",
  accent: "#22d3ee",
  success: "#22c55e",
  warning: "#f5a524",
  khqr: "#e1232e",
} as const;

/** #rrggbb + alpha → rgba() (Satori-safe color syntax). */
export function rgba(hex: string, alpha: number): string {
  const c = safeHex(hex);
  const n = (i: number) => parseInt(c.slice(i, i + 2), 16);
  return `rgba(${n(1)}, ${n(3)}, ${n(5)}, ${alpha})`;
}

/** The Sakai gem mark on the brand gradient (same drawing as src/app/icon.svg). */
export function GemMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.3,
        backgroundImage: `linear-gradient(135deg, ${OG.primary} 0%, ${OG.accent} 100%)`,
        boxShadow: `0 8px 24px ${rgba(OG.primary, 0.45)}`,
      }}
    >
      <svg width={size * 0.78} height={size * 0.78} viewBox="0 0 32 32" fill="none">
        <path d="M9.5 8h13l4.5 5.5L16 26 5 13.5z" fill="#fff" fillOpacity=".22" />
        <path d="M5 13.5h22L16 26z" fill="#fff" fillOpacity=".35" />
        <path d="M13 13.5 16 8l3 5.5L16 26z" fill="#fff" fillOpacity=".55" />
        <path
          d="M9.5 8h13l4.5 5.5L16 26 5 13.5zM5 13.5h22M9.5 8l3.5 5.5L16 26l3-12.5L22.5 8M13 13.5 16 8l3 5.5"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </div>
  );
}

/**
 * Generated game tile (accent gradient + monogram + currency), the same idea
 * as the storefront GameArt: official logos are trademarks and never used.
 */
export function GameTile({
  name,
  currencyName,
  accentColor,
  size,
  showCurrency = true,
}: {
  name: string;
  currencyName: string;
  accentColor: string;
  size: number;
  showCurrency?: boolean;
}) {
  const accent = safeHex(accentColor);
  const initials = latinText(gameInitials(latinText(name, "Game")), "G");
  const mono = initials.length <= 2 ? 0.38 : initials.length === 3 ? 0.32 : 0.26;
  const currency = latinText(currencyName);
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: size * 0.2,
        overflow: "hidden",
        backgroundImage: `linear-gradient(150deg, ${shade(accent, 0.18)} 0%, ${accent} 42%, ${shade(accent, -0.62)} 100%)`,
        boxShadow: `0 ${size * 0.08}px ${size * 0.2}px ${rgba(shade(accent, -0.5), 0.55)}`,
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage: "repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0px, rgba(255,255,255,0.08) 2px, transparent 2px, transparent 16px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: -size * 0.25,
          right: -size * 0.25,
          width: size * 0.8,
          height: size * 0.8,
          display: "flex",
          borderRadius: size,
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 70%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: size * 0.5,
          display: "flex",
          backgroundImage: `linear-gradient(to top, ${rgba(shade(accent, -0.8), 0.85)}, ${rgba(shade(accent, -0.8), 0)})`,
        }}
      />
      <div
        style={{
          display: "flex",
          fontSize: size * mono,
          fontWeight: 700,
          color: "#fff",
          letterSpacing: -size * 0.01,
          marginBottom: showCurrency ? size * 0.1 : 0,
          textShadow: "0 4px 18px rgba(0,0,0,0.35)",
        }}
      >
        {initials}
      </div>
      {showCurrency && currency && (
        <div
          style={{
            position: "absolute",
            bottom: size * 0.07,
            display: "flex",
            maxWidth: size * 0.86,
            padding: `${size * 0.015}px ${size * 0.06}px`,
            borderRadius: size,
            backgroundColor: "rgba(0,0,0,0.35)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "rgba(255,255,255,0.95)",
            fontSize: Math.max(12, size * 0.085),
            fontWeight: 600,
          }}
        >
          {currency}
        </div>
      )}
    </div>
  );
}

/** Small QR-code glyph for the "Pay with KHQR" chip. */
export function QrIcon({ size, color = "#fff" }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3" />
    </svg>
  );
}

/** Lightning bolt glyph for "Instant delivery". */
export function BoltIcon({ size, color = OG.warning }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <path d="M13 2 4.5 13.5H11L10 22l8.5-11.5H12L13 2z" />
    </svg>
  );
}

/** Shield/check glyph for "Safe — no password needed". */
export function ShieldIcon({ size, color = OG.success }: { size: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6L12 3z" />
      <path d="m8.8 12.2 2.2 2.2 4.3-4.6" />
    </svg>
  );
}

/** Rounded chip with an icon, e.g. [QR] Pay with KHQR. */
export function Chip({
  icon,
  label,
  fontSize,
  background = "rgba(255,255,255,0.08)",
  color = OG.fg,
}: {
  icon?: React.ReactNode;
  label: string;
  fontSize: number;
  background?: string;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: fontSize * 0.45,
        padding: `${fontSize * 0.42}px ${fontSize * 0.8}px`,
        borderRadius: fontSize * 2,
        backgroundColor: background,
        border: "1px solid rgba(255,255,255,0.14)",
        color,
        fontSize,
        fontWeight: 600,
      }}
    >
      {icon}
      <div style={{ display: "flex" }}>{label}</div>
    </div>
  );
}

/** Dark background with brand glows and a faint grid (absolute, behind content). */
export function Backdrop({ accent = OG.primary, glow = 0.35 }: { accent?: string; glow?: number }) {
  return (
    <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0, display: "flex", backgroundColor: OG.bg }}>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          backgroundImage: `radial-gradient(circle at 12% 8%, ${rgba(accent, glow)} 0%, ${rgba(accent, 0)} 45%), radial-gradient(circle at 95% 100%, ${rgba(OG.accent, 0.18)} 0%, ${rgba(OG.accent, 0)} 45%)`,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: "flex",
          opacity: 0.5,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 48px), repeating-linear-gradient(90deg, rgba(255,255,255,0.035) 0px, rgba(255,255,255,0.035) 1px, transparent 1px, transparent 48px)",
        }}
      />
    </div>
  );
}
