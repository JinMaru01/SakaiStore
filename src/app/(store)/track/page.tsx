import { PackageSearch } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { RecentOrders, TrackForm } from "@/components/store/track-order";
import { getT } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("track.meta.title"),
    description: t("track.meta.description"),
    alternates: { canonical: "/track" },
  };
}

export default async function TrackPage() {
  const { t } = await getT();
  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-8">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
          <PackageSearch className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{t("track.title")}</h1>
        <p className="mt-2 text-muted">{t("track.subtitle")}</p>
        <TrackForm />
      </div>

      <RecentOrders />

      <section className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface/60 p-5">
        <h2 className="font-semibold">{t("track.help.title")}</h2>
        <p className="mt-1 text-sm text-muted">{t("track.help.body")}</p>
        <Link href="/faq#faq-notReceived" className="mt-3 inline-block text-sm font-semibold text-primary hover:text-fg">
          {t("track.help.link")}
        </Link>
      </section>
    </div>
  );
}
