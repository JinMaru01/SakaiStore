import type { SocialSettings, StoreSettings } from "@/lib/settings";

/**
 * Pure helpers that turn admin settings into the links shown in the header,
 * footer, "Follow us" section and floating chat. Safe for server and client
 * (only type imports from the server-only settings module).
 */

export type SocialNetwork = "facebook" | "tiktok" | "telegram" | "messenger" | "youtube" | "instagram";

const URL_KEY: Record<SocialNetwork, keyof SocialSettings> = {
  facebook: "facebookUrl",
  tiktok: "tiktokUrl",
  telegram: "telegramUrl",
  messenger: "messengerUrl",
  youtube: "youtubeUrl",
  instagram: "instagramUrl",
};

/** Display order for "follow" rows: the two networks we grow on first. */
export const FOLLOW_NETWORKS: SocialNetwork[] = ["facebook", "tiktok", "telegram", "youtube", "instagram"];

export type SocialLink = { network: SocialNetwork; url: string };

/** Only http(s) links are rendered; anything else (empty, javascript:, ...) is dropped. */
export function safeExternalUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** Configured social links, in the order of `networks`. */
export function socialLinks(
  social: Partial<SocialSettings> | null | undefined,
  networks: SocialNetwork[] = FOLLOW_NETWORKS,
): SocialLink[] {
  if (!social) return [];
  const out: SocialLink[] = [];
  for (const network of networks) {
    const url = safeExternalUrl(social[URL_KEY[network]]);
    if (url) out.push({ network, url });
  }
  return out;
}

/**
 * Normalize a Telegram username ("@sakai", "sakai", "t.me/sakai",
 * "https://t.me/sakai") into a https://t.me/<name> link.
 */
export function telegramUserUrl(value: string | null | undefined): string | null {
  const v = value?.trim();
  if (!v) return null;
  const m = v.match(/^(?:https?:\/\/)?(?:t(?:elegram)?\.me\/)?@?([A-Za-z0-9_]{4,32})\/?$/);
  return m ? `https://t.me/${m[1]}` : null;
}

/** Telegram handle for display, e.g. "@sakaisupport". */
export function telegramHandle(value: string | null | undefined): string | null {
  const url = telegramUserUrl(value);
  return url ? `@${url.slice("https://t.me/".length)}` : null;
}

export type ChatLinks = { messenger: string | null; telegram: string | null };

/**
 * Where customers can chat with a human: Messenger (m.me link) and Telegram.
 * The support username wins over the public channel link, because a channel
 * cannot receive private messages.
 */
export function supportChatLinks(
  store: Pick<StoreSettings, "supportTelegram"> | null | undefined,
  social: Pick<SocialSettings, "messengerUrl" | "telegramUrl"> | null | undefined,
): ChatLinks {
  return {
    messenger: safeExternalUrl(social?.messengerUrl),
    telegram: telegramUserUrl(store?.supportTelegram) ?? safeExternalUrl(social?.telegramUrl),
  };
}

/** tel: link for a display phone number like "012 345 678" or "+855 12 345 678". */
export function telHref(phone: string | null | undefined): string | null {
  const digits = phone?.replace(/[^\d+]/g, "") ?? "";
  return digits.replace(/\D/g, "").length >= 6 ? `tel:${digits}` : null;
}

/** "Telegram @handle · 012 345 678" for legal pages and help text; null when nothing is set. */
export function supportContactLine(store: Pick<StoreSettings, "supportTelegram" | "supportPhone">): string | null {
  const handle = telegramHandle(store.supportTelegram);
  const parts = [handle && `Telegram ${handle}`, store.supportPhone.trim()].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}
