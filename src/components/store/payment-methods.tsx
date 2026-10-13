import { cn } from "@/lib/utils";

/**
 * Accepted payment methods. Rendered as text chips (bank logos are
 * trademarks). KHQR gets the official-looking red treatment.
 */
export const PAYMENT_METHODS = ["ABA", "ACLEDA", "Wing"] as const;

export function KhqrBadge({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-8 items-center rounded-lg bg-[#e1232e] px-2.5 font-display text-sm font-bold tracking-wider text-white",
        className,
      )}
    >
      KHQR
    </span>
  );
}

/** "KHQR · ABA · ACLEDA · Wing · any Bakong app" as chips. */
export function PaymentChips({ className, anyBankLabel }: { className?: string; anyBankLabel: string }) {
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      <li>
        <KhqrBadge />
      </li>
      {PAYMENT_METHODS.map((m) => (
        <li
          key={m}
          className="inline-flex h-8 items-center rounded-lg border border-border bg-surface-2 px-2.5 text-sm font-semibold text-fg"
        >
          {m}
        </li>
      ))}
      <li className="inline-flex h-8 items-center rounded-lg border border-dashed border-border px-2.5 text-xs text-muted">
        {anyBankLabel}
      </li>
    </ul>
  );
}
