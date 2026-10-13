"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@/components/store/clipboard";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  /** What is copied, for screen readers: "player ID". */
  label: string;
  /** Show the value itself as the button text (monospace), e.g. a player id. */
  showValue?: boolean;
  className?: string;
};

/**
 * Copy-to-clipboard for the admin (English only, unlike the storefront's
 * i18n CopyButton). With `showValue` the whole value is the tap target —
 * handy on a phone when typing a player id into the game.
 */
export function CopyButton({ value, label, showValue, className }: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    if (!(await copyText(value))) return;
    setCopied(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  }

  const Icon = copied ? Check : Copy;
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={showValue ? `${value} — copy ${label}` : `Copy ${label}`}
        title={`Copy ${label}`}
        className={cn(
          "inline-flex max-w-full items-center gap-1.5 rounded-lg transition-colors",
          showValue
            ? "min-h-9 border border-border bg-surface-2 px-2.5 py-1 font-mono text-sm text-fg hover:border-primary/60"
            : "h-8 w-8 justify-center text-muted hover:bg-surface-2 hover:text-fg",
          copied && "text-success",
          className,
        )}
      >
        {showValue && <span className="min-w-0 break-all">{value}</span>}
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `Copied ${label}` : ""}
      </span>
    </>
  );
}
