import { BadgeDollarSign, Headphones, QrCode, Zap } from "lucide-react";
import type { TranslateFn } from "@/i18n/translate";
import { cn } from "@/lib/utils";

// Claims must hold with manual fulfillment: "fast" (usually minutes), never "instant" or "cheapest".
const CHIPS = [
  { key: "fast", Icon: Zap, color: "text-warning" },
  { key: "khqr", Icon: QrCode, color: "text-[#ff5a63]" },
  { key: "support", Icon: Headphones, color: "text-accent" },
  { key: "fairPrices", Icon: BadgeDollarSign, color: "text-success" },
] as const;

/** "Fast delivery · Pay with KHQR · Real human support · Fair prices" */
export function TrustChips({ t, className }: { t: TranslateFn; className?: string }) {
  return (
    <ul className={cn("grid grid-cols-2 gap-2 sm:flex sm:flex-wrap", className)}>
      {CHIPS.map(({ key, Icon, color }) => (
        <li
          key={key}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface/70 px-3 py-2 text-[13px] font-medium backdrop-blur sm:text-sm"
        >
          <Icon className={cn("h-4 w-4 shrink-0", color)} aria-hidden="true" />
          <span>{t(`home.trust.${key}`)}</span>
        </li>
      ))}
    </ul>
  );
}
