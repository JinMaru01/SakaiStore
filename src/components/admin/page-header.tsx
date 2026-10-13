import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

type Props = {
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Buttons/links shown on the right (below the title on phones). */
  actions?: React.ReactNode;
  back?: { href: string; label: string };
  className?: string;
};

/** Page title row used by every admin page. */
export function PageHeader({ title, description, actions, back, className }: Props) {
  return (
    <header className={cn("mb-5 sm:mb-6", className)}>
      {back && (
        <Link
          href={back.href}
          className="mb-2 inline-flex items-center gap-1.5 rounded-lg text-sm text-muted transition-colors hover:text-fg"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          {back.label}
        </Link>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
          {description && <p className="mt-1 text-sm text-muted">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

/** Section heading inside a page (h2) with optional right-side content. */
export function SectionTitle({
  children,
  action,
  id,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
  id?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 id={id} className="font-display text-base font-semibold sm:text-lg">
        {children}
      </h2>
      {action}
    </div>
  );
}
