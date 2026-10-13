"use client";

import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Input, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";
import { fieldError, FormMessage } from "./form-message";
import { Field } from "./field";
import { ConfirmSubmitButton } from "./submit-button";
import { useAdminAction, type AdminAction } from "./use-admin-action";

function SwitchSubmit({ checked, label }: { checked: boolean; label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={pending}
      className="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60"
    >
      <span className={cn("absolute inset-0 rounded-full ring-1 ring-inset", checked ? "bg-primary ring-primary" : "bg-surface-3 ring-border")} />
      <span
        className={cn(
          "relative ml-1 grid h-4 w-4 place-items-center rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      >
        {pending && <Spinner className="h-3 w-3 text-primary" />}
      </span>
    </button>
  );
}

/**
 * An on/off switch that is a tiny form posting to a server action (inline
 * toggles in lists). `fields` become hidden inputs; "value" is the new state.
 */
export function SwitchForm({
  action,
  fields,
  checked,
  label,
}: {
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string | number>;
  checked: boolean;
  label: string;
}) {
  return (
    <form action={action}>
      {Object.entries(fields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="value" value={String(!checked)} />
      <SwitchSubmit checked={checked} label={label} />
    </form>
  );
}

/** Inline Active/Featured switch on the games list. */
export function GameFlagToggle({
  action,
  gameId,
  flag,
  checked,
  gameName,
}: {
  action: (formData: FormData) => Promise<void>;
  gameId: number;
  flag: "active" | "featured";
  checked: boolean;
  gameName: string;
}) {
  return (
    <SwitchForm
      action={action}
      fields={{ gameId, flag }}
      checked={checked}
      label={`${flag === "active" ? "Active" : "Featured"}: ${gameName}`}
    />
  );
}

function MoveSubmit({ direction, disabled, label }: { direction: "up" | "down"; disabled: boolean; label: string }) {
  const { pending } = useFormStatus();
  const Icon = direction === "up" ? ArrowUp : ArrowDown;
  return (
    <button
      type="submit"
      disabled={disabled || pending}
      aria-label={label}
      className="grid h-8 w-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-fg disabled:opacity-30"
    >
      {pending ? <Spinner className="h-4 w-4" /> : <Icon className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

/** Up/down buttons that reorder games in the storefront. */
export function GameMoveButtons({
  action,
  gameId,
  gameName,
  first,
  last,
}: {
  action: (formData: FormData) => Promise<void>;
  gameId: number;
  gameName: string;
  first: boolean;
  last: boolean;
}) {
  return (
    <div className="flex items-center">
      <form action={action}>
        <input type="hidden" name="gameId" value={gameId} />
        <input type="hidden" name="direction" value="up" />
        <MoveSubmit direction="up" disabled={first} label={`Move ${gameName} up`} />
      </form>
      <form action={action}>
        <input type="hidden" name="gameId" value={gameId} />
        <input type="hidden" name="direction" value="down" />
        <MoveSubmit direction="down" disabled={last} label={`Move ${gameName} down`} />
      </form>
    </div>
  );
}

/** Danger zone: delete only after typing the slug. */
export function DeleteGameForm({
  action,
  gameId,
  slug,
  promoCount,
}: {
  action: AdminAction;
  gameId: number;
  slug: string;
  promoCount: number;
}) {
  const { state, pending, onSubmit } = useAdminAction(action);
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3">
      <input type="hidden" name="gameId" value={gameId} />
      <p className="text-sm text-muted">
        Deletes the game and all its packages. Past orders keep their details.
        {promoCount > 0 &&
          ` ${promoCount} promo code${promoCount === 1 ? "" : "s"} limited to this game will be deactivated.`}{" "}
        To hide it temporarily, switch off <strong className="text-fg">Active</strong> instead.
      </p>
      <Field
        label={
          <>
            Type <code className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-fg">{slug}</code> to confirm
          </>
        }
        error={fieldError(state, "confirmSlug")}
      >
        <Input name="confirmSlug" autoComplete="off" autoCapitalize="none" spellCheck={false} className="max-w-xs" />
      </Field>
      {state.status === "error" && !state.fieldErrors && <FormMessage state={state} />}
      <div>
        <ConfirmSubmitButton variant="danger" confirmLabel="Tap again to delete forever" pending={pending}>
          <Trash2 className="h-4 w-4" aria-hidden="true" />
          Delete game
        </ConfirmSubmitButton>
      </div>
    </form>
  );
}
