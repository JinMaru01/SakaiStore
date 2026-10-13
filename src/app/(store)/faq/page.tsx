import { MessageCircleQuestion, Phone } from "lucide-react";
import type { Metadata } from "next";
import { MessengerIcon, TelegramIcon } from "@/components/icons/brand";
import { hasSupportContact, supportChatLinks } from "@/components/social/social-config";
import { FaqHashOpener } from "@/components/store/faq-hash-opener";
import { FaqList, faqEntries } from "@/components/store/faq-list";
import { JsonLd } from "@/components/store/json-ld";
import { getT } from "@/i18n/server";
import { getSettings } from "@/lib/settings";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getT();
  return {
    title: t("pages.faq.metaTitle"),
    description: t("pages.faq.description"),
    alternates: { canonical: "/faq" },
  };
}

export default async function FaqPage() {
  const [{ t }, settings] = await Promise.all([getT(), getSettings()]);
  const items = faqEntries(t);
  const chat = supportChatLinks(settings.store, settings.social);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: items.map((i) => ({
            "@type": "Question",
            name: i.q,
            acceptedAnswer: { "@type": "Answer", text: i.a },
          })),
        }}
      />
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
        <MessageCircleQuestion className="h-6 w-6" aria-hidden="true" />
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{t("pages.faq.title")}</h1>
      <p className="mt-2 text-muted sm:text-lg">{t("pages.faq.subtitle")}</p>

      <FaqList items={items} className="mt-8" />
      <FaqHashOpener />

      {hasSupportContact(chat) && (
        <section className="mt-10 rounded-[var(--radius-card)] border border-border bg-surface p-5 sm:p-6">
          <h2 className="font-display text-lg font-semibold">{t("pages.faq.stillTitle")}</h2>
          <p className="mt-1 text-muted">{t("pages.faq.stillBody")}</p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {chat.telegram && (
              <a
                href={chat.telegram}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-telegram px-4 font-semibold text-white hover:brightness-110"
              >
                <TelegramIcon className="h-4 w-4" />
                {t("social.chat.telegram")}
              </a>
            )}
            {chat.messenger && (
              <a
                href={chat.messenger}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-messenger px-4 font-semibold text-white hover:brightness-110"
              >
                <MessengerIcon className="h-4 w-4" />
                {t("social.chat.messenger")}
              </a>
            )}
            {/* No chat app configured: the support phone is the fallback. */}
            {!chat.telegram && !chat.messenger && chat.phone && (
              <a
                href={chat.phone.href}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 font-semibold text-primary-fg hover:brightness-110"
              >
                <Phone className="h-4 w-4" aria-hidden="true" />
                {t("social.chat.call", { phone: chat.phone.label })}
              </a>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
