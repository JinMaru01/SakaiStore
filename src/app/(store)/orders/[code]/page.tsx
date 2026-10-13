import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FollowUs } from "@/components/social/follow-us";
import { supportChatLinks } from "@/components/social/social-config";
import { OrderView } from "@/components/store/order-status/order-view";
import { getT } from "@/i18n/server";
import { env, siteUrl } from "@/lib/env";
import { toPublicOrder } from "@/lib/orders/public";
import { getOrderByCode, listOrderEvents, refreshOrderPayment } from "@/lib/orders/service";
import { getSettings } from "@/lib/settings";

// Order pages are private (the code is the access token): never index or follow.
export async function generateMetadata(props: PageProps<"/orders/[code]">): Promise<Metadata> {
  const [{ code }, { t }] = await Promise.all([props.params, getT()]);
  const safeCode = code.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 16);
  return {
    title: t("order.meta.title", { code: safeCode }),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

export default async function OrderPage(props: PageProps<"/orders/[code]">) {
  const { code } = await props.params;
  const found = await getOrderByCode(code);
  if (!found) notFound();

  // Pending orders: ask the bank now so a just-paid order renders as paid.
  const order = await refreshOrderPayment(found);
  const [events, settings, { t }] = await Promise.all([listOrderEvents(order.id), getSettings(), getT()]);
  const publicOrder = toPublicOrder(order, events);

  const gameUrl = `${siteUrl()}/games/${order.gameSlug}`;

  return (
    <OrderView
      initialOrder={publicOrder}
      merchantName={env().BAKONG_MERCHANT_NAME}
      khrPerUsd={settings.store.khrPerUsd}
      chat={supportChatLinks(settings.store, settings.social)}
      share={{
        url: gameUrl,
        title: t("game.meta.title", { game: order.gameName }),
        text: t("social.share.deliveredText", { game: order.gameName, store: settings.store.name }),
      }}
      followUs={<FollowUs social={settings.social} marketing={settings.marketing} variant="card" id="order-follow-us" />}
    />
  );
}
