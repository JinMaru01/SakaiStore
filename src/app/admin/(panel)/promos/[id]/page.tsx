import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/page-header";
import { DeletePromoForm, PromoForm } from "@/components/admin/promo-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/admin/format";
import { orderFiltersToQuery, EMPTY_FILTERS } from "@/lib/admin/order-filters";
import { describeDiscount, promoToFormValues } from "@/lib/admin/promo-schema";
import { getAdminPromo, listGameChoices } from "@/lib/admin/promos";
import { requireAdmin } from "@/lib/auth";
import { deletePromoAction, savePromoAction } from "../actions";

export const metadata: Metadata = { title: "Edit promo code" };

export default async function EditPromoPage(props: PageProps<"/admin/promos/[id]">) {
  await requireAdmin();
  const { id } = await props.params;
  const promoId = /^\d{1,10}$/.test(id) ? Number(id) : NaN;
  const [promo, games] = await Promise.all([
    Number.isSafeInteger(promoId) ? getAdminPromo(promoId) : null,
    listGameChoices(),
  ]);
  if (!promo) notFound();

  return (
    <>
      <PageHeader
        back={{ href: "/admin/promos", label: "Promo codes" }}
        title={<span className="font-mono">{promo.code}</span>}
        description={`${describeDiscount(promo)} · used ${promo.usedCount}${promo.maxUses ? ` of ${promo.maxUses}` : ""} times · created ${formatDateTime(promo.createdAt)}`}
        actions={
          // Orders store the code text, so a search finds every order that used it.
          <Link
            href={`/admin/orders?${orderFiltersToQuery({ ...EMPTY_FILTERS, q: promo.code })}`}
            className="text-sm font-medium text-primary hover:text-fg"
          >
            Orders with this code
          </Link>
        }
      />
      <div className="grid grid-cols-1 max-w-3xl gap-4">
        <Card>
          <CardContent className="pt-4 sm:pt-5">
            <PromoForm
              key={promo.updatedAt.toISOString()}
              action={savePromoAction.bind(null, promo.id)}
              initial={promoToFormValues(promo)}
              games={games}
              isNew={false}
            />
          </CardContent>
        </Card>
        <Card className="border-danger/40">
          <CardHeader>
            <CardTitle className="text-danger">Delete</CardTitle>
          </CardHeader>
          <CardContent>
            <DeletePromoForm action={deletePromoAction} promoId={promo.id} code={promo.code} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}
