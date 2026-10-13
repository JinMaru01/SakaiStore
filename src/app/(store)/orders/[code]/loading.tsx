import { LoadingLabel, Skeleton } from "@/components/store/skeleton";
import { getT } from "@/i18n/server";

/** Mirrors the order page (KHQR card + details) to avoid layout shift. */
export default async function OrderLoading() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <LoadingLabel label={t("common.loading")} />
      <div className="mb-6 flex items-end justify-between gap-3">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-8 w-56" />
        </div>
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-7">
          <div className="grid grid-cols-1 gap-7 md:grid-cols-[19rem_minmax(0,1fr)]">
            <div>
              <div className="mx-auto w-full max-w-[19rem] overflow-hidden rounded-[1.25rem] bg-surface-2">
                <div className="h-14 bg-[#e1232e]/40" />
                <Skeleton className="m-6 aspect-square rounded-none" />
              </div>
              <Skeleton className="mx-auto mt-4 h-8 w-40 rounded-full" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-7 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="mt-6 h-16 w-full rounded-xl" />
              <Skeleton className="h-10 w-full rounded-xl" />
            </div>
          </div>
        </div>
        <Skeleton className="h-80 rounded-[var(--radius-card)]" />
      </div>
    </div>
  );
}
