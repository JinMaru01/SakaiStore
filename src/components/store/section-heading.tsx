import { cn } from "@/lib/utils";

export function SectionHeading({
  id,
  title,
  subtitle,
  action,
  className,
  center,
}: {
  id?: string;
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
  center?: boolean;
}) {
  return (
    <div
      className={cn(
        "mb-5 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 sm:mb-7",
        center && "flex-col items-center text-center",
        className,
      )}
    >
      <div className={cn(center && "mx-auto max-w-2xl")}>
        <h2 id={id} className="font-display text-xl font-bold tracking-tight sm:text-2xl">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-sm text-muted sm:text-base">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
