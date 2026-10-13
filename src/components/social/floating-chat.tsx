"use client";

import { MessageCircle, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { MessengerIcon, TelegramIcon } from "@/components/icons/brand";
import { useT } from "@/i18n/client";
import { track } from "@/lib/tracking/client";
import type { ChatLinks } from "./social-config";

/*
 * Bottom-right chat bubble. On pages with a fixed mobile bottom bar (the order
 * form marks it with data-bottom-bar) it moves up so it never covers the
 * "Pay" button.
 */
const POSITION =
  "fixed right-4 z-40 bottom-[max(1rem,env(safe-area-inset-bottom))] " +
  "max-lg:[body:has([data-bottom-bar])_&]:bottom-28";

const OPTION =
  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-fg transition-colors hover:bg-surface-2";

export function FloatingChat({ messenger, telegram }: ChatLinks) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  if (!messenger && !telegram) return null;

  const bubble =
    "grid h-14 w-14 place-items-center rounded-full bg-brand-gradient text-white shadow-[0_10px_30px_-8px_rgb(124_92_255/0.8)] " +
    "transition-transform hover:scale-105 active:scale-95";

  // Only one channel configured: the bubble links straight to it.
  if (!messenger || !telegram) {
    const href = (messenger ?? telegram)!;
    const Icon = messenger ? MessengerIcon : TelegramIcon;
    return (
      <div className={POSITION}>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={bubble}
          aria-label={messenger ? t("social.chat.messenger") : t("social.chat.telegram")}
          onClick={() => track("Contact")}
        >
          <Icon className="h-6 w-6" />
        </a>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={POSITION}>
      {open && (
        <div
          id={menuId}
          className="absolute right-0 bottom-[4.25rem] w-64 rounded-2xl border border-border bg-surface p-2 shadow-2xl shadow-black/50"
        >
          <p className="px-3 pt-1.5 pb-2 text-xs text-muted">{t("social.chat.title")}</p>
          <a
            href={messenger}
            target="_blank"
            rel="noopener noreferrer"
            className={OPTION}
            onClick={() => {
              track("Contact");
              setOpen(false);
            }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-messenger text-white">
              <MessengerIcon className="h-[18px] w-[18px]" />
            </span>
            {t("social.chat.messenger")}
          </a>
          <a
            href={telegram}
            target="_blank"
            rel="noopener noreferrer"
            className={OPTION}
            onClick={() => {
              track("Contact");
              setOpen(false);
            }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-full bg-telegram text-white">
              <TelegramIcon className="h-[18px] w-[18px]" />
            </span>
            {t("social.chat.telegram")}
          </a>
        </div>
      )}
      <button
        type="button"
        className={bubble}
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        aria-label={open ? t("social.chat.close") : t("social.chat.open")}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? (
          <X className="h-6 w-6" aria-hidden="true" />
        ) : (
          <MessageCircle className="h-6 w-6" aria-hidden="true" />
        )}
      </button>
    </div>
  );
}
