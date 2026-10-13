import { LoadingLabel, Skeleton } from "@/components/store/skeleton";
import { getT } from "@/i18n/server";

/** Mirrors the game page layout so content does not jump when it streams in. */
export default async function GameLoading() {
  const { t } = await getT();
  return (
    <>
      <LoadingLabel label={t("common.loading")} />
      <div className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 pt-4 pb-6 sm:px-6 sm:pt-6 sm:pb-8">
          <Skeleton className="h-4 w-48" />
          <div className="mt-4 flex items-center gap-4 sm:mt-6 sm:gap-6">
            <Skeleton className="aspect-square w-20 rounded-2xl sm:w-28" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-8 w-3/4 max-w-sm" />
              <Skeleton className="h-4 w-1/2 max-w-xs" />
            </div>
          </div>
          <Skeleton className="mt-5 h-4 w-72 max-w-full" />
        </div>
      </div>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 pt-6 pb-8 sm:px-6 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_22rem] xl:gap-8">
        <div className="space-y-4 sm:space-y-5">
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="mt-5 h-11 w-full" />
            <Skeleton className="mt-4 h-10 w-40" />
          </div>
          <div className="rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-6">
            <Skeleton className="h-8 w-56" />
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
              {Array.from({ length: 9 }, (_, i) => (
                <Skeleton key={i} className="h-28 rounded-2xl" />
              ))}
            </div>
          </div>
        </div>
        <div className="hidden lg:block">
          <Skeleton className="h-96 rounded-[var(--radius-card)]" />
        </div>
      </div>
    </>
  );
}
