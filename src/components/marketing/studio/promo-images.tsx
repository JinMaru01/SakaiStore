"use client";

import { Download, ExternalLink, ImageOff } from "lucide-react";
import { useId, useState } from "react";
import { buttonClasses, Label, Select } from "@/components/ui";
import {
  PROMO_FORMAT_IDS,
  PROMO_FORMATS,
  promoImageFileName,
  promoImageUrl,
  type PromoFormat,
} from "@/lib/marketing/promo-formats";
import { cn } from "@/lib/utils";

type CodeOption = { code: string; label: string };

type Props = {
  /** Game slug, or "all" for the all-games poster. */
  slug: string;
  title: string;
  storeName: string;
  codes: CodeOption[];
  /** Pre-selected code (the follower code when live), null = none. */
  defaultCode: string | null;
  /** Cache-buster that changes when prices / codes / settings change. */
  version: string;
};

/** Preview heights keep all three formats side by side at the same height. */
const PREVIEW_W: Record<PromoFormat, string> = {
  square: "w-56 sm:w-64",
  portrait: "w-[179px] sm:w-[205px]",
  story: "w-[126px] sm:w-[144px]",
};

/** Promo image previews for Facebook / TikTok with download buttons. */
export function PromoImages({ slug, title, storeName, codes, defaultCode, version }: Props) {
  const [code, setCode] = useState<string>(defaultCode ?? "none");
  const selectId = useId();

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 sm:max-w-xs sm:flex-1">
          <Label htmlFor={selectId}>Promo code on the image</Label>
          <Select id={selectId} value={code} onChange={(e) => setCode(e.target.value)}>
            <option value="none">No code</option>
            {codes.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </Select>
        </div>
        <p className="text-xs text-muted sm:max-w-sm sm:text-right">
          English + numbers only (link-preview renderers cannot draw Khmer). Write the Khmer text in the caption.
        </p>
      </div>

      <ul className="relative -mx-4 mt-4 flex snap-x scroll-px-4 gap-4 overflow-x-auto px-4 pb-3 sm:mx-0 sm:flex-wrap sm:scroll-px-0 sm:px-0">
        {PROMO_FORMAT_IDS.map((format) => (
          <PreviewCard
            key={`${slug}-${format}-${code}-${version}`}
            format={format}
            src={promoImageUrl(slug, format, { code, v: version })}
            download={promoImageUrl(slug, format, { code, v: version, download: true })}
            fileName={promoImageFileName(storeName, slug, format)}
            title={title}
          />
        ))}
      </ul>
    </div>
  );
}

function PreviewCard({
  format,
  src,
  download,
  fileName,
  title,
}: {
  format: PromoFormat;
  src: string;
  download: string;
  fileName: string;
  title: string;
}) {
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const f = PROMO_FORMATS[format];
  return (
    <li className={cn("shrink-0 snap-start", PREVIEW_W[format])}>
      <div
        className="relative overflow-hidden rounded-xl border border-border bg-surface-2"
        style={{ aspectRatio: `${f.width} / ${f.height}` }}
      >
        {/* Skeleton behind the image: the opaque PNG covers it even if onLoad fired before hydration. */}
        {state === "loading" && <div aria-hidden="true" className="absolute inset-0 animate-pulse bg-surface-3/70" />}
        {state === "error" ? (
          <div className="absolute inset-0 grid place-items-center p-3 text-center text-xs text-muted">
            <span>
              <ImageOff className="mx-auto mb-1.5 h-5 w-5" aria-hidden="true" />
              Could not render. Check the game has active prices.
            </span>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- generated, admin-only PNG; next/image would re-encode it
          <img
            src={src}
            alt={`${f.label} promo image for ${title}`}
            width={f.width}
            height={f.height}
            loading="lazy"
            decoding="async"
            onLoad={() => setState("ready")}
            onError={() => setState("error")}
            className="absolute inset-0 h-full w-full object-cover"
          />
        )}
      </div>
      <p className="mt-2 text-sm font-medium text-fg">{f.label}</p>
      <p className="text-xs text-muted">
        {f.use} · {f.width}×{f.height}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <a href={download} download={fileName} className={buttonClasses("primary", "sm")}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Download
          <span className="sr-only">
            {" "}
            {f.label} image for {title}
          </span>
        </a>
        <a href={src} target="_blank" rel="noopener" className={buttonClasses("ghost", "sm")}>
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
          Open
          <span className="sr-only"> full size (opens in a new tab)</span>
        </a>
      </div>
    </li>
  );
}
