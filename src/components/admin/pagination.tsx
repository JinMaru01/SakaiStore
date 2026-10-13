import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";
import { formatNumber } from "@/lib/utils";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  /** Builds the href for a page number (keeps the current filters). */
  hrefFor: (page: number) => string;
  /** "orders", "codes"… */
  noun?: string;
};

/** Prev/next pagination with a "21–40 of 312" summary (server component). */
export function Pagination({ page, pageCount, total, pageSize, hrefFor, noun = "results" }: Props) {
  const first = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(total, page * pageSize);
  const prev = page > 1 ? Math.min(page - 1, pageCount) : null;
  const next = page < pageCount ? page + 1 : null;

  return (
    <nav aria-label="Pagination" className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-muted" aria-live="polite">
        {total === 0 ? (
          `No ${noun}`
        ) : first > total ? (
          `Page ${page} is past the end (${formatNumber(total)} ${noun})`
        ) : (
          <>
            <span className="font-medium text-fg">
              {formatNumber(first)}–{formatNumber(last)}
            </span>{" "}
            of {formatNumber(total)} {noun}
          </>
        )}
      </p>
      {(prev || next) && (
        <div className="flex items-center gap-2">
          {prev ? (
            <Link href={hrefFor(prev)} className={buttonClasses("secondary", "sm")} rel="prev">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </Link>
          ) : (
            <span className={buttonClasses("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled="true">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              Previous
            </span>
          )}
          <span className="px-1 text-sm text-muted">
            {Math.min(page, pageCount)} / {pageCount}
          </span>
          {next ? (
            <Link href={hrefFor(next)} className={buttonClasses("secondary", "sm")} rel="next">
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className={buttonClasses("secondary", "sm", "pointer-events-none opacity-40")} aria-disabled="true">
              Next
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
      )}
    </nav>
  );
}
