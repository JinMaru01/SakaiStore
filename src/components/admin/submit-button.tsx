"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui";

type PendingProps = {
  /** Pending state for forms submitted via useAdminAction (useFormStatus only tracks `action` forms). */
  pending?: boolean;
};

/** Submit button that shows a spinner while its form is submitting. */
export function SubmitButton({
  children,
  disabled,
  pendingLabel,
  pending: pendingProp,
  ...props
}: ButtonProps & PendingProps & { pendingLabel?: string }) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  return (
    <Button type="submit" loading={pending} disabled={disabled} aria-disabled={pending || disabled} {...props}>
      {pending && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

type ConfirmProps = Omit<ButtonProps, "type" | "onClick"> &
  PendingProps & {
  /** Label shown after the first tap, e.g. "Tap again to refund". */
  confirmLabel: string;
  /** How long the armed state lasts. */
  timeoutMs?: number;
  name?: string;
  value?: string;
};

/**
 * Two-step submit for consequential actions (deliver, refund, cancel,
 * delete): the first tap arms the button, the second submits. Works the same
 * with mouse, touch and keyboard, and avoids window.confirm(), which some
 * in-app browsers block.
 */
export function ConfirmSubmitButton({
  children,
  confirmLabel,
  timeoutMs = 4000,
  variant = "secondary",
  disabled,
  pending: pendingProp,
  ...props
}: ConfirmProps) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  const [armed, setArmed] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <>
      <Button
        type="submit"
        variant={armed ? (variant === "success" ? "success" : "danger") : variant}
        loading={pending}
        disabled={disabled}
        onClick={(e) => {
          if (armed) {
            // Second tap: disarm and let the form submit.
            clearTimeout(timer.current);
            setArmed(false);
            return;
          }
          e.preventDefault();
          setArmed(true);
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setArmed(false), timeoutMs);
        }}
        {...props}
      >
        {armed && !pending ? confirmLabel : children}
      </Button>
      <span className="sr-only" role="status" aria-live="polite">
        {armed && !pending ? confirmLabel : ""}
      </span>
    </>
  );
}
