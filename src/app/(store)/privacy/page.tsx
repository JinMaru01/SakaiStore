import { ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import { supportContactLine } from "@/components/social/social-config";
import { LegalPage } from "@/components/store/legal-page";
import { getT } from "@/i18n/server";
import { getSettings } from "@/lib/settings";

const SECTIONS = ["collect", "use", "marketing", "sharing", "storage", "retention", "rights", "children", "changes"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("pages.privacy.title"),
    description: t("pages.privacy.description"),
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const [{ t }, { store }] = await Promise.all([getT(), getSettings()]);
  const contact = supportContactLine(store) ?? t("pages.contactFallback");
  return (
    <LegalPage t={t} page="privacy" sections={SECTIONS} Icon={ShieldCheck} storeName={store.name} contact={contact} />
  );
}
