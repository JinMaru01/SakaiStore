"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { IDLE, type ActionState } from "@/lib/admin/forms";
import { useToast } from "./toast";

export type AdminAction = (prev: ActionState, formData: FormData) => Promise<ActionState>;

type Options = {
  /** Toast every result (default true). Inline field errors still come from `state`. */
  toast?: boolean;
  /** Clear the submitted form after a success (notes, quick inputs). */
  resetOnSuccess?: boolean;
  onSuccess?: (state: ActionState) => void;
};

/**
 * useActionState for admin forms, submitted via onSubmit instead of the
 * form `action` prop. React resets `action` forms after every submission —
 * including validation errors — which would wipe what the owner typed. Here
 * the form is only reset on success, when asked. Results are toasted from the
 * panel-level provider so they survive the re-render that follows.
 * Redirects thrown by the action still propagate to Next's redirect boundary.
 */
export function useAdminAction(action: AdminAction, options: Options = {}) {
  const toast = useToast();
  const lastForm = useRef<HTMLFormElement | null>(null);
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });

  const [state, dispatch, pending] = useActionState(async (prev: ActionState, formData: FormData) => {
    const result = await action(prev, formData);
    if (opts.current.toast !== false) toast.fromState(result);
    if (result.status === "success") {
      if (opts.current.resetOnSuccess) lastForm.current?.reset();
      opts.current.onSuccess?.(result);
    }
    return result;
  }, IDLE);

  // Which form is submitting (its "intent" field), so only that button shows a spinner.
  const [lastIntent, setLastIntent] = useState<string | null>(null);

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    lastForm.current = event.currentTarget;
    const formData = new FormData(event.currentTarget);
    const intent = formData.get("intent");
    setLastIntent(typeof intent === "string" ? intent : null);
    startTransition(() => dispatch(formData));
  }

  /** True while the form with this intent is submitting. */
  const isPending = (intent: string) => pending && lastIntent === intent;

  return { state, pending, isPending, onSubmit };
}
