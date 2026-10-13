"use client";

import { Clapperboard, TriangleAlert } from "lucide-react";
import { useId, useMemo, useState } from "react";
import { FacebookIcon, TikTokIcon } from "@/components/icons/brand";
import { Card, Input, Label, Select, Textarea } from "@/components/ui";
import {
  CAPTION_TEMPLATES,
  defaultGiveawayEnd,
  generateCaptions,
  TIKTOK_CAPTION_LIMIT,
  type CaptionCatalogItem,
  type CaptionGame,
  type CaptionPackage,
  type CaptionTemplate,
  type Lang,
} from "@/lib/marketing/captions";
import type { PromoOffer } from "@/lib/marketing/promo-offer";
import { cn } from "@/lib/utils";
import { CopyTextButton } from "./copy-text-button";

type CodeOption = { code: string; label: string; offer: PromoOffer };

export type CaptionStudioProps = {
  game: CaptionGame | null;
  packages: CaptionPackage[];
  catalog: CaptionCatalogItem[];
  storeName: string;
  siteUrl: string;
  hashtags: string;
  tiktokHandle: string | null;
  codes: CodeOption[];
  defaultCodes: { facebook: string | null; tiktok: string | null };
  /** Server clock (ISO) so server and browser render the same default dates. */
  nowIso: string;
};

const LANGS: { id: Lang; label: string }[] = [
  { id: "en", label: "English" },
  { id: "km", label: "ខ្មែរ" },
];

/** Template + language → Facebook post, TikTok caption and video script, each with a copy button. */
export function CaptionStudio(props: CaptionStudioProps) {
  const { game, packages, catalog, storeName, siteUrl, hashtags, tiktokHandle, codes, defaultCodes, nowIso } = props;
  const [template, setTemplate] = useState<CaptionTemplate>("price_list");
  const [lang, setLang] = useState<Lang>("km");
  const [fbCode, setFbCode] = useState(defaultCodes.facebook ?? "");
  const [ttCode, setTtCode] = useState(defaultCodes.tiktok ?? "");
  const [ends, setEnds] = useState("");
  const [prize, setPrize] = useState("");
  const [winners, setWinners] = useState("3");
  const ids = { template: useId(), fb: useId(), tt: useId(), ends: useId(), prize: useId(), winners: useId(), tabs: useId() };

  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const offers = useMemo(() => Object.fromEntries(codes.map((c) => [c.code, c.offer])), [codes]);
  const result = useMemo(
    () =>
      generateCaptions({
        template,
        game,
        packages,
        catalog,
        storeName,
        siteUrl,
        hashtags,
        tiktokHandle,
        platformPromoCodes: { facebook: fbCode || null, tiktok: ttCode || null },
        promoOffers: offers,
        ends: ends.trim() || null,
        giveaway: { prize: prize.trim() || null, winners: Number(winners) || 3 },
        now,
      }),
    [template, game, packages, catalog, storeName, siteUrl, hashtags, tiktokHandle, fbCode, ttCode, offers, ends, prize, winners, now],
  );
  const meta = CAPTION_TEMPLATES.find((t) => t.id === template)!;
  const giveawayEnd = defaultGiveawayEnd(now);
  const tiktokLength = [...result.tiktok[lang]].length;

  const outputs = [
    {
      id: "facebook",
      title: "Facebook post",
      icon: <FacebookIcon className="h-4 w-4 text-facebook" />,
      text: result.facebook[lang],
      rows: 14,
      counter: null as string | null,
    },
    {
      id: "tiktok",
      title: "TikTok caption",
      icon: <TikTokIcon className="h-4 w-4 text-tiktok" />,
      text: result.tiktok[lang],
      rows: 7,
      counter: `${tiktokLength.toLocaleString("en-US")} / ${TIKTOK_CAPTION_LIMIT.toLocaleString("en-US")}`,
    },
    {
      id: "script",
      title: "Video script (TikTok / Reels)",
      icon: <Clapperboard className="h-4 w-4 text-accent" />,
      text: result.videoScript[lang],
      rows: 16,
      counter: null,
    },
  ];

  const codeSelect = (id: string, label: string, value: string, onChange: (v: string) => void) => (
    <div className="min-w-0">
      <Label htmlFor={id}>{label}</Label>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">No code</option>
        {codes.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </Select>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="min-w-0 sm:col-span-2 lg:col-span-1">
          <Label htmlFor={ids.template}>Template</Label>
          <Select id={ids.template} value={template} onChange={(e) => setTemplate(e.target.value as CaptionTemplate)}>
            {CAPTION_TEMPLATES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </Select>
          <p className="mt-1.5 text-xs text-muted">{meta.description}</p>
        </div>
        {codeSelect(ids.fb, "Code in Facebook post", fbCode, setFbCode)}
        {codeSelect(ids.tt, "Code in TikTok caption", ttCode, setTtCode)}

        {(template === "flash_sale" || template === "giveaway") && (
          <div className="min-w-0">
            <Label htmlFor={ids.ends}>
              Ends <span className="font-normal text-muted">(optional)</span>
            </Label>
            <Input
              id={ids.ends}
              value={ends}
              maxLength={80}
              onChange={(e) => setEnds(e.target.value)}
              placeholder={template === "giveaway" ? giveawayEnd.en : "e.g. Sunday 9 PM"}
              aria-describedby={`${ids.ends}-hint`}
            />
            <p id={`${ids.ends}-hint`} className="mt-1.5 text-xs text-muted">
              {template === "giveaway" ? "Blank = next Sunday 8 PM, written in both languages." : "Blank = “limited time”."}
            </p>
          </div>
        )}
        {template === "giveaway" && (
          <>
            <div className="min-w-0">
              <Label htmlFor={ids.prize}>
                Prize <span className="font-normal text-muted">(optional)</span>
              </Label>
              <Input
                id={ids.prize}
                value={prize}
                maxLength={80}
                onChange={(e) => setPrize(e.target.value)}
                placeholder={game ? "Best-value package" : "$5 top-up"}
              />
            </div>
            <div className="min-w-0">
              <Label htmlFor={ids.winners}>Winners</Label>
              <Input
                id={ids.winners}
                type="number"
                inputMode="numeric"
                min={1}
                max={50}
                value={winners}
                onChange={(e) => setWinners(e.target.value)}
              />
            </div>
          </>
        )}
      </div>

      {result.warnings.length > 0 && (
        <div role="status" className="mt-4 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm text-fg">
          <ul className="grid gap-1.5">
            {result.warnings.map((w) => (
              <li key={w} className="flex gap-2">
                <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                <span>{w}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div role="tablist" aria-label="Caption language" className="mt-5 inline-flex rounded-xl border border-border bg-surface-2 p-1">
        {LANGS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="tab"
            id={`${ids.tabs}-${l.id}`}
            aria-selected={lang === l.id}
            aria-controls={`${ids.tabs}-panel`}
            tabIndex={lang === l.id ? 0 : -1}
            onClick={() => setLang(l.id)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                const next = lang === "en" ? "km" : "en";
                setLang(next);
                document.getElementById(`${ids.tabs}-${next}`)?.focus();
              }
            }}
            className={cn(
              "h-9 rounded-lg px-4 text-sm font-medium transition-colors",
              lang === l.id ? "bg-primary text-primary-fg" : "text-muted hover:text-fg",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div
        id={`${ids.tabs}-panel`}
        role="tabpanel"
        aria-labelledby={`${ids.tabs}-${lang}`}
        className="mt-3 grid grid-cols-1 gap-4 xl:grid-cols-3"
      >
        {outputs.map((o) => (
          <Card key={o.id} className="flex min-w-0 flex-col p-3.5 sm:p-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                {o.icon}
                {o.title}
              </h3>
              {o.counter && (
                <span className={cn("text-xs tabular-nums", tiktokLength > TIKTOK_CAPTION_LIMIT ? "text-danger" : "text-muted")}>
                  {o.counter}
                </span>
              )}
            </div>
            <Textarea
              readOnly
              lang={lang}
              value={o.text}
              rows={o.rows}
              aria-label={`${o.title} (${lang === "km" ? "Khmer" : "English"})`}
              className="mt-2.5 flex-1 resize-y text-sm leading-relaxed"
              onFocus={(e) => e.currentTarget.select()}
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <CopyTextButton value={o.text} what={`${o.title} in ${lang === "km" ? "Khmer" : "English"}`} variant="primary" />
            </div>
          </Card>
        ))}
      </div>

      <dl className="mt-4 grid gap-2 text-xs text-muted sm:grid-cols-2">
        <div className="min-w-0">
          <dt className="font-medium text-fg">Facebook link</dt>
          <dd className="break-all">{result.links.facebook}</dd>
        </div>
        <div className="min-w-0">
          <dt className="font-medium text-fg">TikTok link (bio / pinned comment)</dt>
          <dd className="break-all">{result.links.tiktok}</dd>
        </div>
      </dl>
    </div>
  );
}
