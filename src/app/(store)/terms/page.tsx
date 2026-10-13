import { FileText } from "lucide-react";
import type { Metadata } from "next";
import { supportContactLine } from "@/components/social/social-config";
import { LegalPage } from "@/components/store/legal-page";
import { getT } from "@/i18n/server";
import { getSettings } from "@/lib/settings";

const SECTIONS = ["service", "orders", "prices", "payment", "delivery", "refunds", "promos", "conduct", "liability", "changes"] as const;

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("pages.terms.title"),
    description: t("pages.terms.description"),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const [{ t }, { store }] = await Promise.all([getT(), getSettings()]);
  const contact = supportContactLine(store) ?? t("pages.contactFallback");
  return <LegalPage t={t} page="terms" sections={SECTIONS} Icon={FileText} storeName={store.name} contact={contact} />;
}
