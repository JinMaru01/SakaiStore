"use client";

import { Check, Link2, Share2 } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { FacebookIcon, MessengerIcon, TelegramIcon } from "@/components/icons/brand";
import { copyText } from "@/components/store/clipboard";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import {
  facebookShareUrl,
  isMobileUserAgent,
  messengerShareUrl,
  telegramShareUrl,
  withShareUtm,
} from "./share-urls";

const noopSubscribe = () => () => {};
const useIsMobile = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => isMobileUserAgent(navigator.userAgent),
    () => false,
  );
const useCanNativeShare = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => typeof navigator.share === "function",
    () => false,
  );

type Props = {
  /** Absolute canonical URL to share (no tracking params; UTM tags are added per network). */
  url: string;
  /** Message prefilled where the network supports it (Telegram, native share). */
  text: string;
  title?: string;
  heading?: string;
  className?: string;
};

const BTN =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-2";

/**
 * Share this page to Facebook, Messenger (mobile only), Telegram, copy the
 * link (for TikTok bio / comments / DMs) or the native share sheet. Every
 * link carries utm_source=<network>&utm_medium=share for attribution.
 */
export function ShareBar({ url, text, title, heading, className }: Props) {
  const t = useT();
  const isMobile = useIsMobile();
  const canShare = useCanNativeShare();
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    if (await copyText(withShareUtm(url, "copy"))) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  }

  async function onNativeShare() {
    try {
      await navigator.share({ title, text, url: withShareUtm(url, "native") });
    } catch {
      // user cancelled or share failed: nothing to do
    }
  }

  return (
    <div className={cn("rounded-[var(--radius-card)] border border-border bg-surface p-4 sm:p-5", className)}>
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Share2 className="h-4 w-4 text-accent" aria-hidden="true" />
        {heading ?? t("social.share.title")}
      </p>
      <div className="flex flex-wrap gap-2">
        <a
          href={facebookShareUrl(url)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(BTN, "bg-facebook text-white hover:brightness-110")}
          aria-label={t("social.share.on", { network: "Facebook" })}
        >
          <FacebookIcon className="h-4 w-4" />
          <span>Facebook</span>
        </a>
        {isMobile && (
          <a
            href={messengerShareUrl(url)}
            className={cn(BTN, "bg-messenger text-white hover:brightness-110")}
            aria-label={t("social.share.on", { network: "Messenger" })}
          >
            <MessengerIcon className="h-4 w-4" />
            <span>Messenger</span>
          </a>
        )}
        <a
          href={telegramShareUrl(url, text)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(BTN, "bg-telegram text-white hover:brightness-110")}
          aria-label={t("social.share.on", { network: "Telegram" })}
        >
          <TelegramIcon className="h-4 w-4" />
          <span>Telegram</span>
        </a>
        <button
          type="button"
          onClick={onCopy}
          className={cn(
            BTN,
            "border border-border bg-surface-2 hover:bg-surface-3",
            copied ? "text-success" : "text-fg",
          )}
        >
          {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
          <span>{copied ? t("social.share.copied") : t("social.share.copyLink")}</span>
        </button>
        {canShare && (
          <button
            type="button"
            onClick={onNativeShare}
            className={cn(BTN, "border border-border bg-surface-2 text-fg hover:bg-surface-3")}
          >
            <Share2 className="h-4 w-4" aria-hidden="true" />
            <span>{t("social.share.more")}</span>
          </button>
        )}
      </div>
      <p className="mt-2.5 text-xs text-muted">{t("social.share.copyHint")}</p>
      <span className="sr-only" role="status" aria-live="polite">
        {copied ? t("social.share.copied") : ""}
      </span>
    </div>
  );
}
