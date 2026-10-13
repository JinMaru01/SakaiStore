"use client";

import { Ban, Banknote, CircleCheck, CircleX, RotateCcw, StickyNote, Undo2 } from "lucide-react";
import { useId, useState } from "react";
import { Button, FieldError, Input, Label, Textarea } from "@/components/ui";
import { availableOrderActions } from "@/lib/admin/order-actions";
import type { OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";
import { fieldError, FormMessage } from "./form-message";
import { ConfirmSubmitButton, SubmitButton } from "./submit-button";
import { useAdminAction, type AdminAction } from "./use-admin-action";

type Panel = "fail" | "refund" | "paid" | null;

function Hidden({ intent, orderId }: { intent: string; orderId: string }) {
  return (
    <>
      <input type="hidden" name="intent" value={intent} />
      <input type="hidden" name="orderId" value={orderId} />
    </>
  );
}

type Props = {
  orderId: string;
  status: OrderStatus;
  action: AdminAction;
  /** Shown in the refund confirmation. */
  totalLabel: string;
};

/**
 * Order detail actions. Only transitions the state machine allows for the
 * current status are offered; the server re-checks atomically anyway.
 */
export function OrderActionsPanel({ orderId, status, action, totalLabel }: Props) {
  const [panel, setPanel] = useState<Panel>(null);
  const { state, pending, isPending, onSubmit } = useAdminAction(action, { onSuccess: () => setPanel(null) });
  const can = availableOrderActions(status);
  const ids = useId();
  const toggle = (p: Exclude<Panel, null>) => setPanel((cur) => (cur === p ? null : p));
  const nothing = !Object.values(can).some(Boolean);

  return (
    <div className="grid grid-cols-1 gap-3">
      {nothing && (
        <p className="text-sm text-muted">
          This order is final — no status changes are possible. You can still add internal notes.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {can.deliver && (
          <form onSubmit={onSubmit}>
            <Hidden intent="deliver" orderId={orderId} />
            <ConfirmSubmitButton variant="success" confirmLabel="Tap again to confirm" pending={isPending("deliver")} disabled={pending}>
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Mark delivered
            </ConfirmSubmitButton>
          </form>
        )}
        {can.process && (
          <form onSubmit={onSubmit}>
            <Hidden intent="retry" orderId={orderId} />
            <SubmitButton variant="secondary" pending={isPending("retry")} disabled={pending}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              {status === "failed" ? "Retry (back to processing)" : "Start processing"}
            </SubmitButton>
          </form>
        )}
        {can.fail && (
          <Button
            type="button"
            variant={panel === "fail" ? "danger" : "secondary"}
            aria-expanded={panel === "fail"}
            aria-controls={`${ids}-fail`}
            onClick={() => toggle("fail")}
          >
            <CircleX className="h-4 w-4" aria-hidden="true" />
            Mark failed…
          </Button>
        )}
        {can.markPaid && (
          <Button
            type="button"
            variant={panel === "paid" ? "primary" : "secondary"}
            aria-expanded={panel === "paid"}
            aria-controls={`${ids}-paid`}
            onClick={() => toggle("paid")}
          >
            <Banknote className="h-4 w-4" aria-hidden="true" />
            Mark as paid manually…
          </Button>
        )}
        {can.refund && (
          <Button
            type="button"
            variant="ghost"
            aria-expanded={panel === "refund"}
            aria-controls={`${ids}-refund`}
            onClick={() => toggle("refund")}
          >
            <Undo2 className="h-4 w-4" aria-hidden="true" />
            Refund…
          </Button>
        )}
        {can.cancel && (
          <form onSubmit={onSubmit}>
            <Hidden intent="cancel" orderId={orderId} />
            <ConfirmSubmitButton variant="ghost" confirmLabel="Tap again to cancel order" pending={isPending("cancel")} disabled={pending}>
              <Ban className="h-4 w-4" aria-hidden="true" />
              Cancel order
            </ConfirmSubmitButton>
          </form>
        )}
      </div>

      {panel === "fail" && can.fail && (
        <form id={`${ids}-fail`} onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-danger/30 bg-danger/5 p-3.5">
          <Hidden intent="fail" orderId={orderId} />
          <div>
            <Label htmlFor={`${ids}-reason`}>Reason</Label>
            <Textarea
              id={`${ids}-reason`}
              name="reason"
              required
              minLength={3}
              maxLength={500}
              rows={2}
              placeholder="e.g. Wrong Zone ID — waiting for the customer to confirm"
              aria-invalid={fieldError(state, "reason") ? true : undefined}
              aria-describedby={`${ids}-reason-hint`}
              className="min-h-16"
            />
            <p id={`${ids}-reason-hint`} className="mt-1.5 text-xs text-muted">
              Saved on the order timeline; the customer is notified that the order failed.
            </p>
            <FieldError>{fieldError(state, "reason")}</FieldError>
          </div>
          <div className="flex flex-wrap gap-2">
            <SubmitButton variant="danger" pending={isPending("fail")} disabled={pending}>
              <CircleX className="h-4 w-4" aria-hidden="true" />
              Mark failed
            </SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
              Close
            </Button>
          </div>
        </form>
      )}

      {panel === "paid" && can.markPaid && (
        <form id={`${ids}-paid`} onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5">
          <Hidden intent="mark_paid" orderId={orderId} />
          <p className="text-sm text-muted">
            Only use this when you can see the payment in your bank / Bakong app and the automatic check missed it.
            The order then moves on to delivery.
          </p>
          <div>
            <Label htmlFor={`${ids}-ref`}>Payment reference</Label>
            <Input
              id={`${ids}-ref`}
              name="reference"
              required
              minLength={3}
              maxLength={128}
              autoComplete="off"
              placeholder="Transaction hash / bank reference"
              aria-invalid={fieldError(state, "reference") ? true : undefined}
            />
            <FieldError>{fieldError(state, "reference")}</FieldError>
          </div>
          <label className="flex items-start gap-2.5 text-sm">
            <input
              type="checkbox"
              name="confirm"
              required
              className="mt-0.5 h-4 w-4 shrink-0 accent-[var(--color-primary)]"
              aria-invalid={fieldError(state, "confirm") ? true : undefined}
            />
            <span>I confirm I received {totalLabel} for this order.</span>
          </label>
          <FieldError>{fieldError(state, "confirm")}</FieldError>
          <div className="flex flex-wrap gap-2">
            <SubmitButton pending={isPending("mark_paid")} disabled={pending}>
              <Banknote className="h-4 w-4" aria-hidden="true" />
              Mark as paid
            </SubmitButton>
            <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
              Close
            </Button>
          </div>
        </form>
      )}

      {panel === "refund" && can.refund && (
        <form id={`${ids}-refund`} onSubmit={onSubmit} className="grid grid-cols-1 gap-3 rounded-xl border border-border bg-surface-2/60 p-3.5">
          <Hidden intent="refund" orderId={orderId} />
          <p className="text-sm text-muted">
            This only records the refund. Send {totalLabel} back to the customer yourself (ABA / Bakong) first.
          </p>
          <div>
            <Label htmlFor={`${ids}-refund-note`}>
              Note <span className="font-normal text-muted">(optional)</span>
            </Label>
            <Input id={`${ids}-refund-note`} name="message" maxLength={500} placeholder="e.g. Refunded via ABA, ref 1234" />
          </div>
          <div className="flex flex-wrap gap-2">
            <ConfirmSubmitButton variant="secondary" confirmLabel="Tap again to mark refunded" pending={isPending("refund")} disabled={pending}>
              <Undo2 className="h-4 w-4" aria-hidden="true" />
              Mark refunded
            </ConfirmSubmitButton>
            <Button type="button" variant="ghost" onClick={() => setPanel(null)}>
              Close
            </Button>
          </div>
        </form>
      )}

      {state.status === "error" && !state.fieldErrors && <FormMessage state={state} />}
    </div>
  );
}

/** Internal note form (never shown to the customer). */
export function OrderNoteForm({ orderId, action }: { orderId: string; action: AdminAction }) {
  const { state, pending, onSubmit } = useAdminAction(action, { resetOnSuccess: true });
  const id = useId();
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-1 gap-2">
      <Hidden intent="note" orderId={orderId} />
      <Label htmlFor={id} className="sr-only">
        Internal note
      </Label>
      <Textarea
        id={id}
        name="note"
        required
        maxLength={2000}
        rows={2}
        placeholder="Add an internal note (only admins see this)…"
        aria-invalid={fieldError(state, "note") ? true : undefined}
        className="min-h-16"
      />
      <FieldError>{fieldError(state, "note")}</FieldError>
      <div>
        <SubmitButton variant="secondary" size="sm" pending={pending}>
          <StickyNote className="h-4 w-4" aria-hidden="true" />
          Add note
        </SubmitButton>
      </div>
    </form>
  );
}

/**
 * One-tap actions for the dashboard "Needs delivery" queue: ✅ Delivered
 * (tap twice to confirm) and ❌ Failed with an inline reason.
 */
export function QuickOrderActions({
  orderId,
  status,
  action,
  className,
}: {
  orderId: string;
  status: OrderStatus;
  action: AdminAction;
  className?: string;
}) {
  const [failing, setFailing] = useState(false);
  const { state, pending, isPending, onSubmit } = useAdminAction(action, { onSuccess: () => setFailing(false) });
  const can = availableOrderActions(status);
  const id = useId();

  return (
    <div className={cn("grid grid-cols-1 gap-2", className)}>
      <div className="flex flex-wrap gap-2">
        {can.deliver && (
          <form onSubmit={onSubmit}>
            <Hidden intent="deliver" orderId={orderId} />
            <ConfirmSubmitButton variant="success" size="sm" confirmLabel="Tap again" pending={isPending("deliver")} disabled={pending}>
              <CircleCheck className="h-4 w-4" aria-hidden="true" />
              Delivered
            </ConfirmSubmitButton>
          </form>
        )}
        {can.fail && (
          <Button
            type="button"
            size="sm"
            variant={failing ? "danger" : "secondary"}
            aria-expanded={failing}
            aria-controls={`${id}-fail`}
            onClick={() => setFailing((v) => !v)}
          >
            <CircleX className="h-4 w-4" aria-hidden="true" />
            Failed
          </Button>
        )}
        {status === "failed" && can.process && (
          <form onSubmit={onSubmit}>
            <Hidden intent="retry" orderId={orderId} />
            <SubmitButton size="sm" variant="secondary" pending={isPending("retry")} disabled={pending}>
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Retry
            </SubmitButton>
          </form>
        )}
      </div>
      {failing && can.fail && (
        <form id={`${id}-fail`} onSubmit={onSubmit} className="flex flex-col gap-2 sm:flex-row sm:items-start">
          <Hidden intent="fail" orderId={orderId} />
          <div className="min-w-0 flex-1">
            <Label htmlFor={`${id}-reason`} className="sr-only">
              Reason
            </Label>
            <Input
              id={`${id}-reason`}
              name="reason"
              required
              minLength={3}
              maxLength={500}
              placeholder="Reason (e.g. wrong Zone ID)"
              autoFocus
              aria-invalid={fieldError(state, "reason") ? true : undefined}
              className="h-9 text-sm"
            />
            <FieldError>{fieldError(state, "reason")}</FieldError>
          </div>
          <SubmitButton size="sm" variant="danger" pending={isPending("fail")} disabled={pending} className="h-9">
            Mark failed
          </SubmitButton>
        </form>
      )}
    </div>
  );
}
