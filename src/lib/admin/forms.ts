import type { z } from "zod";

/**
 * Shared shapes for admin server actions used with React's useActionState.
 * Results are plain serializable objects; `at` changes on every result so the
 * UI can re-announce a repeated message. Pure; safe for server and client.
 */

export type FieldErrors = Record<string, string>;

export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string; at: number }
  | { status: "error"; message: string; fieldErrors?: FieldErrors; at: number };

export const IDLE: ActionState = { status: "idle" };

export function ok(message: string): ActionState {
  return { status: "success", message, at: Date.now() };
}

export function fail(message: string, fieldErrors?: FieldErrors): ActionState {
  return { status: "error", message, fieldErrors, at: Date.now() };
}

/** First message per field path ("tagline.en", "packages.2.price"). Form-level issues use "_form". */
export function fieldErrorsFromZod(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.length ? issue.path.map(String).join(".") : "_form";
    if (!(key in out)) out[key] = issue.message;
  }
  return out;
}

/** String value of a form field ("" when missing or a File). */
export function formString(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v : "";
}

/** Checkbox / switch value: present with "on" | "true" | "1". */
export function formBool(fd: FormData, key: string): boolean {
  const v = fd.get(key);
  return v === "on" || v === "true" || v === "1";
}

/** Postgres unique violation (23505); drizzle wraps pg errors in `cause`. */
export function isUniqueViolation(err: unknown): boolean {
  for (let e = err as { code?: string; cause?: unknown } | undefined; e; e = e.cause as typeof e) {
    if (e.code === "23505") return true;
  }
  return false;
}
