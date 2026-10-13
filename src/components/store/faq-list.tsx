import { ChevronDown } from "lucide-react";
import type { TranslateFn } from "@/i18n/translate";
import { cn } from "@/lib/utils";
import { paragraphs } from "./rich-text";

/** FAQ entries (i18n keys pages.faq.items.<id>.q / .a). The first ones are shown on the home page. */
export const FAQ_IDS = [
  "delivery",
  "findId",
  "payment",
  "safety",
  "wrongId",
  "notReceived",
  "expired",
  "refund",
  "promo",
  "contact",
] as const;

export type FaqId = (typeof FAQ_IDS)[number];

export function faqEntries(t: TranslateFn, ids: readonly FaqId[] = FAQ_IDS) {
  return ids.map((id) => ({ id, q: t(`pages.faq.items.${id}.q`), a: t(`pages.faq.items.${id}.a`) }));
}

/** Accordion built on <details>/<summary>: accessible and works without JavaScript. */
export function FaqList({ items, className }: { items: { id: string; q: string; a: string }[]; className?: string }) {
  return (
    <div className={cn("divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface", className)}>
      {items.map((item) => (
        <details key={item.id} id={`faq-${item.id}`} className="group scroll-mt-24">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-4 py-4 font-medium transition-colors hover:bg-surface-2/50 sm:px-5 [&::-webkit-details-marker]:hidden">
            <span>{item.q}</span>
            <ChevronDown
              className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <div className="space-y-3 px-4 pb-5 text-sm leading-relaxed text-muted sm:px-5 sm:text-base">
            {paragraphs(item.a).map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
