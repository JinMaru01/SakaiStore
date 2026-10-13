import { CircleAlert, CircleCheck } from "lucide-react";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";

/**
 * Inline result of a server action (useActionState). Errors use role="alert"
 * so screen readers announce them immediately; successes are polite.
 */
export function FormMessage({ state, className }: { state: ActionState; className?: string }) {
  if (state.status === "idle") return null;
  const error = state.status === "error";
  const Icon = error ? CircleAlert : CircleCheck;
  return (
    <p
      key={state.at}
      role={error ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-xl px-3 py-2.5 text-sm ring-1 ring-inset",
        error ? "bg-danger/10 text-danger ring-danger/30" : "bg-success/10 text-success ring-success/30",
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{state.message}</span>
    </p>
  );
}

/** Field error lookup that tolerates the idle state. */
export function fieldError(state: ActionState, name: string): string | undefined {
  return state.status === "error" ? state.fieldErrors?.[name] : undefined;
}
