"use client";

import { CircleAlert, CircleCheck, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ActionState } from "@/lib/admin/forms";
import { cn } from "@/lib/utils";

/**
 * Minimal toast system for the admin panel. Lives in the panel layout so a
 * toast survives the re-render that follows a server action (e.g. a queue
 * row disappearing after "Delivered").
 */

type Toast = { id: number; kind: "success" | "error"; message: string };
type ToastApi = {
  show: (kind: Toast["kind"], message: string) => void;
  /** Toast an action result (no-op for idle). */
  fromState: (state: ActionState) => void;
};

const ToastContext = createContext<ToastApi | null>(null);
const DURATION_MS = 5000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const show = useCallback((kind: Toast["kind"], message: string) => {
    const id = ++nextId.current;
    setToasts((t) => [...t.slice(-2), { id, kind, message }]);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      show,
      fromState: (s) => {
        if (s.status !== "idle") show(s.status, s.message);
      },
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        role="region"
        aria-label="Notifications"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[60] flex flex-col items-center gap-2 p-4 sm:items-end"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: number) => void }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setTimeout(() => onDismiss(toast.id), DURATION_MS);
    return () => clearTimeout(t);
  }, [paused, toast.id, onDismiss]);

  const Icon = toast.kind === "error" ? CircleAlert : CircleCheck;
  return (
    <div
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className={cn(
        "pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border bg-surface-2 px-4 py-3 text-sm shadow-2xl shadow-black/50",
        toast.kind === "error" ? "border-danger/50" : "border-success/50",
      )}
    >
      <Icon
        className={cn("mt-0.5 h-4 w-4 shrink-0", toast.kind === "error" ? "text-danger" : "text-success")}
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-fg">{toast.message}</p>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="-m-1 grid h-7 w-7 shrink-0 place-items-center rounded-lg text-muted hover:bg-surface-3 hover:text-fg"
        aria-label="Dismiss notification"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  // Outside the provider (e.g. login page) toasts are silently dropped.
  return ctx ?? { show: () => {}, fromState: () => {} };
}

/**
 * One-shot toast for a redirect "flash" (?flash=game_created). The server
 * maps the whitelisted code to text; this shows it once and strips the
 * query param so a refresh does not repeat it.
 */
export function FlashToast({ message, kind = "success" }: { message: string | null; kind?: Toast["kind"] }) {
  const { show } = useToast();
  const shown = useRef(false);
  useEffect(() => {
    if (!message || shown.current) return;
    shown.current = true;
    show(kind, message);
    const url = new URL(window.location.href);
    if (url.searchParams.has("flash")) {
      url.searchParams.delete("flash");
      window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
    }
  }, [message, kind, show]);
  return null;
}
