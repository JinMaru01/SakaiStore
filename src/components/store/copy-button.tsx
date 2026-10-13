"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { copyText } from "./clipboard";

type Props = {
  value: string;
  /** Visible label; defaults to "Copy". Use `iconOnly` for a compact button. */
  label?: string;
  copiedLabel?: string;
  /** Accessible name when iconOnly (e.g. "Copy order code"). */
  ariaLabel?: string;
  iconOnly?: boolean;
  className?: string;
  onCopied?: () => void;
};

/** Copy-to-clipboard button with a 2s "Copied!" confirmation announced to screen readers. */
export function CopyButton({ value, label, copiedLabel, ariaLabel, iconOnly, className, onCopied }: Props) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    if (!(await copyText(value))) return;
    setCopied(true);
    onCopied?.();
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }

  const text = copied ? (copiedLabel ?? t("common.copied")) : (label ?? t("common.copy"));
  const Icon = copied ? Check : Copy;

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-label={iconOnly ? (copied ? text : (ariaLabel ?? text)) : ariaLabel}
        className={cn(
          "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors",
          iconOnly
            ? "h-9 w-9 text-muted hover:bg-surface-2 hover:text-fg"
            : "h-9 px-3 text-sm bg-surface-2 text-fg hover:bg-surface-3 border border-border",
          copied && "text-success",
          className,
        )}
      >
        <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
        {!iconOnly && <span>{text}</span>}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("common.copied") : ""}
      </span>
    </>
  );
}
