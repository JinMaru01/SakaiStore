import { cn } from "@/lib/utils";
import { STATUS_STYLES, type OrderStatus } from "@/lib/orders/status";

export function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
        "bg-surface-2 text-fg ring-border",
        className,
      )}
      {...props}
    />
  );
}

/** Colored status pill. Pass the (translated) label as children. */
export function StatusBadge({ status, children }: { status: OrderStatus; children: React.ReactNode }) {
  return <Badge className={STATUS_STYLES[status]}>{children}</Badge>;
}
