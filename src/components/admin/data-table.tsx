import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /** Applied to both th and td (alignment, width, responsive hiding). */
  className?: string;
};

type Props<T> = {
  rows: readonly T[];
  columns: readonly Column<T>[];
  rowKey: (row: T) => string | number;
  /** Accessible table name (visually hidden). */
  caption: string;
  empty?: React.ReactNode;
  className?: string;
};

/**
 * Plain semantic table for desktop lists (server component). Pages pair it
 * with a card list for phones, where wide tables do not work.
 */
export function DataTable<T>({ rows, columns, rowKey, caption, empty, className }: Props<T>) {
  if (rows.length === 0 && empty) return <>{empty}</>;
  return (
    <div className={cn("overflow-x-auto rounded-[var(--radius-card)] border border-border bg-surface", className)}>
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border text-left text-xs font-medium tracking-wide text-muted uppercase">
            {columns.map((c) => (
              <th key={c.key} scope="col" className={cn("px-4 py-3 font-medium whitespace-nowrap", c.className)}>
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50"
            >
              {columns.map((c) => (
                <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                  {c.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Friendly empty state for lists. */
export function EmptyState({
  icon: Icon,
  title,
  children,
  className,
}: {
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-[var(--radius-card)] border border-dashed border-border bg-surface/50 px-6 py-10 text-center",
        className,
      )}
    >
      {Icon && <Icon className="mb-3 h-8 w-8 text-muted" aria-hidden />}
      <p className="font-medium text-fg">{title}</p>
      {children && <div className="mt-1 max-w-sm text-sm text-muted">{children}</div>}
    </div>
  );
}
