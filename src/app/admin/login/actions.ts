"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminSession, destroyAdminSession, requireAdmin, verifyAdminPassword } from "@/lib/auth";
import { formString } from "@/lib/admin/forms";
import { safeAdminNext } from "@/lib/admin/redirect";
import { env } from "@/lib/env";
import { rateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/request";

export type LoginState = { error: string | null; at?: number };

const MAX_ATTEMPTS_PER_MINUTE = 5;

/** Password sign-in. Rate-limited per IP; on success redirects to a safe /admin path. */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = getClientIp(await headers());
  const limit = rateLimit(`admin-login:${ip}`, MAX_ATTEMPTS_PER_MINUTE, 60_000);
  if (!limit.ok) {
    const seconds = Math.max(1, Math.ceil(limit.retryAfterMs / 1000));
    return { error: `Too many attempts. Try again in ${seconds} seconds.`, at: Date.now() };
  }
  if (!env().ADMIN_PASSWORD) {
    return { error: "Admin sign-in is not configured (ADMIN_PASSWORD is not set).", at: Date.now() };
  }

  const password = formString(formData, "password");
  if (!password || password.length > 1024 || !verifyAdminPassword(password)) {
    console.warn(`[admin] failed sign-in attempt from ${ip}`);
    return {
      error: limit.remaining > 0 ? "Wrong password." : "Wrong password. Wait a minute before trying again.",
      at: Date.now(),
    };
  }

  await createAdminSession();
  redirect(safeAdminNext(formString(formData, "next")));
}

export async function logoutAction(): Promise<void> {
  await requireAdmin();
  await destroyAdminSession();
  redirect("/admin/login?flash=signed_out");
}
