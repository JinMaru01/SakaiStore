import type { LucideIcon } from "lucide-react";
import type { TranslateFn } from "@/i18n/translate";
import { paragraphs } from "./rich-text";

/**
 * Shared layout for /terms and /privacy. Content lives in the "pages" i18n
 * namespace as pages.<page>.sections.<id>.title / .body.
 */
export function LegalPage({
  t,
  page,
  sections,
  Icon,
  storeName,
  contact,
}: {
  t: TranslateFn;
  page: "terms" | "privacy";
  sections: readonly string[];
  Icon: LucideIcon;
  storeName: string;
  contact: string;
}) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <Icon className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{t(`pages.${page}.title`)}</h1>
      <p className="mt-2 text-sm text-muted">{t(`pages.${page}.updated`)}</p>
      <p className="mt-6 leading-relaxed text-fg/90">{t(`pages.${page}.intro`, { store: storeName })}</p>

      <nav aria-label={t("pages.toc")} className="mt-8 rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5">
        <p className="text-sm font-semibold">{t("pages.toc")}</p>
        <ol className="mt-2 grid gap-1.5 text-sm sm:grid-cols-2">
          {sections.map((id, i) => (
            <li key={id}>
              <a href={`#${id}`} className="text-muted hover:text-fg">
                {i + 1}. {t(`pages.${page}.sections.${id}.title`)}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mt-10 space-y-10">
        {sections.map((id, i) => (
          <section key={id} id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24">
            <h2 id={`${id}-title`} className="font-display text-xl font-semibold">
              {i + 1}. {t(`pages.${page}.sections.${id}.title`)}
            </h2>
            <div className="mt-3 space-y-3 leading-relaxed text-muted">
              {paragraphs(t(`pages.${page}.sections.${id}.body`, { store: storeName, contact })).map((p, j) => (
                <p key={j}>{p}</p>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
