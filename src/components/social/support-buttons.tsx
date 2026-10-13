"use client";

import { Phone } from "lucide-react";
import { MessengerIcon, TelegramIcon } from "@/components/icons/brand";
import { useT } from "@/i18n/client";
import { track } from "@/lib/tracking/client";
import { cn } from "@/lib/utils";
import { hasSupportContact, type ChatLinks } from "./social-config";

/**
 * "Chat on Telegram / Messenger" buttons to reach a human (order problems,
 * FAQ, unknown order code). Telegram is the support username only, never the
 * public channel; when no chat app is configured the support phone is shown
 * instead. Renders nothing when no contact is configured at all.
 */
export function SupportButtons({ chat, className, compact }: { chat: ChatLinks; className?: string; compact?: boolean }) {
  const t = useT();
  if (!hasSupportContact(chat)) return null;
  const btn = cn(
    "inline-flex items-center justify-center gap-2 rounded-xl px-4 font-semibold text-white hover:brightness-110",
    compact ? "h-10 text-sm" : "h-11",
  );
  return (
    <div className={cn("flex flex-col gap-2 sm:flex-row", compact && "sm:flex-col", className)}>
      {chat.telegram && (
        <a
          href={chat.telegram}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("Contact")}
          className={cn(btn, "bg-telegram")}
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
          onClick={() => track("Contact")}
          className={cn(btn, "bg-messenger")}
        >
          <MessengerIcon className="h-4 w-4" />
          {t("social.chat.messenger")}
        </a>
      )}
      {!chat.telegram && !chat.messenger && chat.phone && (
        <a href={chat.phone.href} onClick={() => track("Contact")} className={cn(btn, "bg-primary")}>
          <Phone className="h-4 w-4" aria-hidden="true" />
          {t("social.chat.call", { phone: chat.phone.label })}
        </a>
      )}
    </div>
  );
}
