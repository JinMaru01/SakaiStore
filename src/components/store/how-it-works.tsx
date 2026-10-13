import { Gamepad2, QrCode, UserRoundCheck, Zap } from "lucide-react";
import type { TranslateFn } from "@/i18n/translate";
import { SectionHeading } from "./section-heading";

const STEPS = [
  { key: "step1", Icon: Gamepad2 },
  { key: "step2", Icon: UserRoundCheck },
  { key: "step3", Icon: QrCode },
  { key: "step4", Icon: Zap },
] as const;

export function HowItWorks({ t }: { t: TranslateFn }) {
  return (
    <section aria-labelledby="how-it-works">
      <SectionHeading id="how-it-works" title={t("home.how.title")} subtitle={t("home.how.subtitle")} />
      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ key, Icon }, i) => (
          <li
            key={key}
            className="relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface p-5"
          >
            <span
              aria-hidden="true"
              className="absolute -top-3 right-3 font-display text-7xl font-bold text-white/[0.04]"
            >
              {i + 1}
            </span>
            <span className="grid h-11 w-11 place-items-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/30">
              <Icon className="h-5 w-5" aria-hidden="true" />
            </span>
            <h3 className="mt-4 font-semibold">
              <span className="sr-only">{i + 1}. </span>
              {t(`home.how.${key}.title`)}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">{t(`home.how.${key}.body`)}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
