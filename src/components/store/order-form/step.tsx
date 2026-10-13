import { cn } from "@/lib/utils";

/** Numbered order-form step card. Renders as a fieldset when `asFieldset` (radio groups). */
export function Step({
  n,
  title,
  hint,
  children,
  className,
  id,
  asFieldset,
  optional,
}: {
  n: number;
  title: string;
  hint?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  asFieldset?: boolean;
  optional?: string;
}) {
  const heading = (
    <span className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-brand-gradient font-display text-sm font-bold text-white shadow-[0_4px_14px_-4px_rgb(124_92_255/0.8)]"
      >
        {n}
      </span>
      <span className="font-display text-base font-semibold sm:text-lg">{title}</span>
      {optional && <span className="text-xs font-normal text-muted">({optional})</span>}
    </span>
  );
  const box = cn(
    "scroll-mt-24 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6",
    className,
  );

  if (asFieldset) {
    return (
      <fieldset id={id} className={box}>
        <legend className="float-left mb-4 w-full">{heading}</legend>
        <div className="clear-both">
          {hint && <div className="-mt-1 mb-4 text-sm text-muted">{hint}</div>}
          {children}
        </div>
      </fieldset>
    );
  }
  return (
    <section id={id} className={box} aria-labelledby={id ? `${id}-title` : undefined}>
      <h2 id={id ? `${id}-title` : undefined} className="mb-4">
        {heading}
      </h2>
      {hint && <div className="-mt-1 mb-4 text-sm text-muted">{hint}</div>}
      {children}
    </section>
  );
}
