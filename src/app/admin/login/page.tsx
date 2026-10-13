import { KeyRound } from "lucide-react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/admin/login-form";
import { LogoMark } from "@/components/store/logo";
import { Card } from "@/components/ui";
import { flashMessage } from "@/lib/admin/flash";
import { safeAdminNext } from "@/lib/admin/redirect";
import { getAdminSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { getSettings } from "@/lib/settings";
import { loginAction } from "./actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function AdminLoginPage(props: PageProps<"/admin/login">) {
  const sp = await props.searchParams;
  const next = safeAdminNext(Array.isArray(sp.next) ? sp.next[0] : sp.next);
  // Already signed in (e.g. an old bookmark): go straight in.
  if (await getAdminSession()) redirect(next);

  const { store } = await getSettings();
  const configured = !!env().ADMIN_PASSWORD;
  const flash = flashMessage(sp.flash);

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark className="h-12 w-12" />
          <h1 className="mt-4 font-display text-2xl font-bold">{store.name} Admin</h1>
          <p className="mt-1 text-sm text-muted">Sign in to manage orders, games and promotions.</p>
        </div>
        <Card className="p-5 sm:p-6">
          {flash && (
            <p role="status" className="mb-4 rounded-xl bg-success/10 px-3 py-2.5 text-sm text-success ring-1 ring-success/30 ring-inset">
              {flash}
            </p>
          )}
          {configured ? (
            <LoginForm action={loginAction} next={next} />
          ) : (
            <div className="text-sm">
              <div className="mb-3 flex items-center gap-2 font-semibold text-warning">
                <KeyRound className="h-4 w-4" aria-hidden="true" />
                Admin password not set
              </div>
              <p className="text-muted">
                Sign-in is disabled until you set an admin password. Add it to your environment and restart the
                server (on Vercel: Project → Settings → Environment Variables, then redeploy):
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-border bg-surface-2 px-3 py-2.5 font-mono text-xs text-fg">
                ADMIN_PASSWORD=a-long-unique-password{"\n"}AUTH_SECRET=paste-a-long-random-string
              </pre>
              <p className="mt-3 text-muted">
                Use a password you don’t use anywhere else. Generate the secret with{" "}
                <code className="font-mono text-fg">openssl rand -base64 32</code>.
              </p>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
