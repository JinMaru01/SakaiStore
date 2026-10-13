"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { copyText } from "@/components/store/clipboard";
import { buttonClasses } from "@/components/ui";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  /** Visible label, e.g. "Copy caption". */
  label?: string;
  /** What is copied, for screen readers ("Facebook post"). */
  what: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
};

/** Labeled copy-to-clipboard button with a polite live-region confirmation. */
export function CopyTextButton({ value, label = "Copy", what, variant = "secondary", size = "sm", className, disabled }: Props) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);

  async function onClick() {
    const ok = await copyText(value);
    setCopied(ok);
    setFailed(!ok);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setCopied(false);
      setFailed(false);
    }, 2000);
  }

  const Icon = copied ? Check : Copy;
  return (
    <>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled || !value}
        aria-label={`${label} — ${what}`}
        className={cn(buttonClasses(variant, size), copied && "text-success", className)}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
        {copied ? "Copied" : failed ? "Copy failed" : label}
      </button>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? `Copied ${what}` : failed ? `Could not copy ${what}. Select the text and copy it manually.` : ""}
      </span>
    </>
  );
}
