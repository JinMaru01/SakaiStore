import { AdminShell } from "@/components/admin/admin-shell";
import { ToastProvider } from "@/components/admin/toast";
import { countOrdersNeedingAction } from "@/lib/admin/stats";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { logoutAction } from "../login/actions";

/** Protected admin area. Pages and actions call requireAdmin() again (layouts don't re-run on navigation). */
export default async function AdminPanelLayout({ children }: LayoutProps<"/admin">) {
  await requireAdmin();
  const [settings, needsAction] = await Promise.all([getSettings(), countOrdersNeedingAction()]);
  return (
    <ToastProvider>
      <AdminShell storeName={settings.store.name} needsAction={needsAction} logoutAction={logoutAction}>
        {children}
      </AdminShell>
    </ToastProvider>
  );
}
