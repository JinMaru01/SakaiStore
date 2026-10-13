import { NotFoundContent } from "@/components/store/not-found-content";
import { getT } from "@/i18n/server";

/** notFound() inside the store (unknown game, unknown order code). Rendered within the store layout. */
export default async function StoreNotFound() {
  const { t } = await getT();
  return <NotFoundContent t={t} />;
}
