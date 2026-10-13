import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { PromoForm } from "@/components/admin/promo-form";
import { Card, CardContent } from "@/components/ui";
import { EMPTY_PROMO } from "@/lib/admin/promo-schema";
import { listGameChoices } from "@/lib/admin/promos";
import { requireAdmin } from "@/lib/auth";
import { savePromoAction } from "../actions";

export const metadata: Metadata = { title: "New promo code" };

export default async function NewPromoPage() {
  await requireAdmin();
  const games = await listGameChoices();
  return (
    <>
      <PageHeader back={{ href: "/admin/promos", label: "Promo codes" }} title="New promo code" />
      <Card className="max-w-3xl">
        <CardContent className="pt-4 sm:pt-5">
          <PromoForm action={savePromoAction.bind(null, null)} initial={EMPTY_PROMO} games={games} isNew />
        </CardContent>
      </Card>
    </>
  );
}
