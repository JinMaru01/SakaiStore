import { Plug } from "lucide-react";
import type { Metadata } from "next";
import { IntegrationStatus } from "@/components/admin/integration-status";
import { PageHeader } from "@/components/admin/page-header";
import { MarketingSettingsForm, SocialSettingsForm, StoreSettingsForm } from "@/components/admin/settings-forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { getIntegrationStatus } from "@/lib/admin/integrations";
import { requireAdmin } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSettingsAction } from "./actions";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await getSettings();
  const integrations = getIntegrationStatus();

  return (
    <>
      <PageHeader title="Settings" description="Store details, social links and marketing defaults." />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-1 min-w-0 content-start gap-4 lg:col-span-2">
          <StoreSettingsForm values={settings.store} action={saveSettingsAction.bind(null, "store")} />
          <SocialSettingsForm values={settings.social} action={saveSettingsAction.bind(null, "social")} />
          <MarketingSettingsForm values={settings.marketing} action={saveSettingsAction.bind(null, "marketing")} />
        </div>
        <Card className="content-start self-start">
          <CardHeader className="items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Plug className="h-4 w-4 text-muted" aria-hidden="true" />
                Integrations status
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted">
                Read-only. These come from environment variables — change them on your server or hosting
                dashboard, then restart/redeploy.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <IntegrationStatus groups={integrations} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
