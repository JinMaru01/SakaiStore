"use client";

import { cloneElement, isValidElement, useId } from "react";
import { FieldError, Label } from "@/components/ui";
import { cn } from "@/lib/utils";

type ControlProps = {
  id?: string;
  "aria-invalid"?: boolean;
  "aria-describedby"?: string;
};

type Props = {
  label: React.ReactNode;
  hint?: React.ReactNode;
  error?: string;
  /** A single input/select/textarea; receives id, aria-invalid and aria-describedby. */
  children: React.ReactElement<ControlProps>;
  className?: string;
  optional?: boolean;
  /**
   * For composite controls (e.g. color picker + hex input): the id of the
   * element the label points at. Children are rendered untouched; wire
   * aria-invalid on the control yourself.
   */
  controlId?: string;
};

/** Label + control + hint + error, wired together for screen readers. */
export function Field({ label, hint, error, children, className, optional, controlId }: Props) {
  const autoId = useId();
  const id = controlId ?? ((isValidElement(children) && children.props.id) || autoId);
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={cn("min-w-0", className)}>
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </Label>
      {controlId
        ? children
        : cloneElement(children, {
            id,
            "aria-invalid": error ? true : undefined,
            "aria-describedby": describedBy,
          })}
      {hint && !error && (
        <p id={hintId} className="mt-1.5 text-xs text-muted">
          {hint}
        </p>
      )}
      {error && (
        <div id={errorId}>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </div>
  );
}

type SwitchProps = {
  name?: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
};

/** Accessible on/off switch (a real checkbox with role="switch", so forms submit it natively). */
export function Switch({ name, label, description, checked, defaultChecked, onChange, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-4 rounded-xl border border-border bg-surface-2/50 px-3.5 py-3",
        disabled && "cursor-not-allowed opacity-60",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block text-sm font-medium text-fg">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-muted">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input
          id={id}
          type="checkbox"
          role="switch"
          name={name}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
          className="peer sr-only"
        />
        <span
          aria-hidden="true"
          className="h-6 w-11 rounded-full bg-surface-3 ring-1 ring-border transition-colors peer-checked:bg-primary peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent"
        />
        <span
          aria-hidden="true"
          className="absolute top-1 left-1 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}
