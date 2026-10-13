import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: React.ReactNode;
  /** Secondary line under the value (context, comparison). */
  sub?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  /** Draws attention when something needs action (e.g. orders waiting). */
  tone?: "default" | "attention";
  href?: string;
};

/**
 * KPI tile: label · value · optional sub-line. The value uses the body sans
 * with proportional figures (display fonts read as decoration at this size).
 */
export function StatCard({ label, value, sub, icon: Icon, tone = "default", href }: Props) {
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted sm:text-sm">{label}</p>
        {Icon && (
          <Icon
            className={cn("h-4 w-4 shrink-0", tone === "attention" ? "text-warning" : "text-muted/70")}
            aria-hidden
          />
        )}
      </div>
      <p className="mt-1.5 text-xl font-semibold leading-tight text-fg sm:text-2xl">{value}</p>
      {sub && <p className="mt-1 text-xs text-muted">{sub}</p>}
    </>
  );
  const classes = cn(
    "block rounded-[var(--radius-card)] border bg-surface p-3.5 sm:p-4",
    tone === "attention" ? "border-warning/50" : "border-border",
    href && "transition-colors hover:border-primary/60",
  );
  return href ? (
    <Link href={href} className={classes}>
      {body}
    </Link>
  ) : (
    <div className={classes}>{body}</div>
  );
}
