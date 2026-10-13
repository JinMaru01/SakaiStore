"use client";

import { Eye, EyeOff, LogIn } from "lucide-react";
import { useActionState, useState } from "react";
import { Input, Label } from "@/components/ui";
import { SubmitButton } from "./submit-button";

type LoginState = { error: string | null; at?: number };

type Props = {
  action: (prev: LoginState, formData: FormData) => Promise<LoginState>;
  next: string;
};

export function LoginForm({ action, next }: Props) {
  const [state, formAction] = useActionState(action, { error: null });
  const [visible, setVisible] = useState(false);

  return (
    <form action={formAction} className="grid grid-cols-1 gap-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <div>
        <Label htmlFor="admin-password">Password</Label>
        <div className="relative">
          <Input
            id="admin-password"
            name="password"
            type={visible ? "text" : "password"}
            autoComplete="current-password"
            autoFocus
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "admin-login-error" : undefined}
            className="pr-12"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 right-0 grid w-11 place-items-center rounded-r-xl text-muted hover:text-fg"
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
          >
            {visible ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
          </button>
        </div>
        {state.error && (
          <p key={state.at} id="admin-login-error" role="alert" className="mt-2 text-sm text-danger">
            {state.error}
          </p>
        )}
      </div>
      <SubmitButton size="lg" className="w-full" pendingLabel="Signing in…">
        <LogIn className="h-4 w-4" aria-hidden="true" />
        Sign in
      </SubmitButton>
    </form>
  );
}
