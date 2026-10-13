import { cn } from "@/lib/utils";

/** Two-column term/value list for detail pages; stacks on narrow screens. */
export function DetailList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <dl className={cn("divide-y divide-border/60", className)}>{children}</dl>;
}

export function DetailRow({
  label,
  children,
  mono,
}: {
  label: React.ReactNode;
  children: React.ReactNode;
  mono?: boolean;
}) {
  const empty = children == null || children === "" || children === false;
  return (
    <div className="grid grid-cols-1 gap-1 py-2.5 sm:grid-cols-[10rem_1fr] sm:gap-3">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={cn("min-w-0 text-sm break-words text-fg", mono && "font-mono", empty && "text-muted")}>
        {empty ? "—" : children}
      </dd>
    </div>
  );
}
