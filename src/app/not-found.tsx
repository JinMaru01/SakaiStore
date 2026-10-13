import type { Metadata } from "next";
import { NotFoundContent } from "@/components/store/not-found-content";
import { StoreShell } from "@/components/store/store-shell";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return { title: t("common.notFound.title") };
}

/**
 * Unmatched URLs anywhere in the app. Renders inside the root layout only, so
 * it wraps itself in the store chrome to keep the header/footer navigation.
 */
export default async function NotFound() {
  const { t } = await getT();
  return (
    <StoreShell>
      <NotFoundContent t={t} />
    </StoreShell>
  );
}
