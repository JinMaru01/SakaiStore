"use client";

import { Download } from "lucide-react";
import { create, toDataURL } from "qrcode";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui";
import { useT } from "@/i18n/client";
import { formatUsd } from "@/lib/utils";
import { qrPath } from "./helpers";

/*
 * Error correction "Q" (25%) keeps the code scannable with the currency mark
 * drawn over its centre, like the official KHQR artwork.
 */
const QR_OPTS = { errorCorrectionLevel: "Q" as const };

/** Build the QR as an SVG path synchronously (also during SSR: no flash, no layout shift). */
function useQr(text: string) {
  return useMemo(() => {
    try {
      const qr = create(text, QR_OPTS);
      const size = qr.modules.size;
      return { size, path: qrPath(size, (r, c) => qr.modules.get(r, c)) };
    } catch {
      return null;
    }
  }, [text]);
}

type Props = {
  khqr: string;
  merchantName: string;
  totalCents: number;
  /** Dimmed when the payment window is over. */
  expired?: boolean;
};

/** KHQR payment card styled after the official KHQR frame (red header, amount, QR). */
export function KhqrCard({ khqr, merchantName, totalCents, expired }: Props) {
  const t = useT();
  const qr = useQr(khqr);
  return (
    <figure
      className="relative mx-auto w-full max-w-[19rem] overflow-hidden rounded-[1.25rem] bg-white text-[#141414] shadow-[0_24px_60px_-20px_rgb(225_35_46/0.55)]"
      aria-label={t("order.khqr.aria", { amount: formatUsd(totalCents), merchant: merchantName })}
    >
      <div className="relative flex h-14 items-center justify-center bg-[#e1232e]">
        <span className="font-display text-2xl font-bold tracking-[0.12em] text-white">KHQR</span>
        {/* The KHQR frame's signature folded corner */}
        <span
          aria-hidden="true"
          className="absolute right-0 -bottom-px h-0 w-0 border-b-[22px] border-l-[22px] border-b-white border-l-transparent"
        />
      </div>
      <div className="px-6 pt-4 pb-3">
        <p className="truncate text-sm font-medium text-[#5c5c5c]">{merchantName}</p>
        <p className="mt-0.5 flex items-baseline gap-1.5">
          <span className="font-display text-[1.75rem] leading-tight font-bold">{formatUsd(totalCents).slice(1)}</span>
          <span className="text-sm font-semibold text-[#5c5c5c]">USD</span>
        </p>
      </div>
      <div aria-hidden="true" className="mx-0 border-t-2 border-dashed border-[#d9d9d9]" />
      <div className="relative p-5 sm:p-6">
        {qr ? (
          <svg
            // 2-module quiet zone inside the card's white padding
            viewBox={`-2 -2 ${qr.size + 4} ${qr.size + 4}`}
            className={expired ? "h-auto w-full opacity-15 blur-[1px]" : "h-auto w-full"}
            shapeRendering="crispEdges"
            role="img"
            aria-label={t("order.khqr.qrAlt")}
          >
            <path d={qr.path} fill="#000" />
          </svg>
        ) : (
          <div className="grid aspect-square place-items-center text-center text-sm text-[#5c5c5c]">
            {t("order.khqr.qrError")}
          </div>
        )}
        {qr && !expired && (
          <span
            aria-hidden="true"
            className="absolute top-1/2 left-1/2 grid h-[15%] w-[15%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-black font-display text-lg font-bold text-white ring-[5px] ring-white"
          >
            $
          </span>
        )}
      </div>
    </figure>
  );
}

/**
 * "Download QR": saves a PNG so customers paying from the same phone can pick
 * it from the gallery in their bank app. In-app browsers (Facebook/TikTok)
 * often block downloads, so the image is also shown for press-and-hold saving.
 */
export function DownloadQrButton({ khqr, code }: { khqr: string; code: string }) {
  const t = useT();
  const [png, setPng] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const filename = `sakai-${code}.png`;

  async function onDownload() {
    setBusy(true);
    try {
      const url = png ?? (await toDataURL(khqr, { ...QR_OPTS, width: 720, margin: 3 }));
      setPng(url);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      // keep the button usable; the fallback image is shown when available
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <Button type="button" variant="secondary" onClick={onDownload} loading={busy} className="w-full">
        {!busy && <Download className="h-4 w-4" aria-hidden="true" />}
        {t("order.pending.download")}
      </Button>
      {png && (
        <div className="mt-3 rounded-xl border border-border bg-surface-2/60 p-3 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- data: URL generated on the device */}
          <img src={png} alt={t("order.khqr.qrAlt")} width={160} height={160} className="mx-auto rounded-lg bg-white" />
          <p className="mt-2 text-xs text-muted">{t("order.pending.downloadHint")}</p>
        </div>
      )}
    </div>
  );
}
