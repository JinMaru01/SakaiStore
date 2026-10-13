"use client";

import { useId, useMemo, useState } from "react";
import { Input, Label, Select } from "@/components/ui";
import {
  buildUtmLink,
  presetLandingUrl,
  presetParams,
  UTM_PRESETS,
  utmValue,
  withPromoParam,
  type UtmPresetId,
} from "@/lib/marketing/utm";
import { cn } from "@/lib/utils";
import { CopyTextButton } from "./copy-text-button";

type Props = {
  siteUrl: string;
  /** Selected game, or null for "All games". */
  game: { slug: string; name: string } | null;
  codes: { code: string; label: string }[];
};

type Landing = "game" | "home" | "custom";

const PATH_RE = /^\/[A-Za-z0-9\-._~/%]*$/;

/**
 * UTM link builder with presets for every place a link gets pasted (page
 * posts, ads, Messenger auto-reply, TikTok bio, pinned comments, Telegram),
 * so each order shows where it came from in Channel performance.
 */
export function UtmBuilder({ siteUrl, game, codes }: Props) {
  const base = siteUrl.replace(/\/+$/, "");
  const [presetId, setPresetId] = useState<UtmPresetId>("facebook_post");
  const preset = UTM_PRESETS.find((p) => p.id === presetId)!;
  const initial = presetParams(preset, game?.slug ?? null);
  const [fields, setFields] = useState({ source: initial.source, medium: initial.medium, campaign: initial.campaign, content: initial.content ?? "" });
  const [landing, setLanding] = useState<Landing>(game && !preset.homeOnly ? "game" : "home");
  const [customPath, setCustomPath] = useState("/");
  const [code, setCode] = useState("");
  const id = useId();

  function choosePreset(next: UtmPresetId) {
    const p = UTM_PRESETS.find((x) => x.id === next)!;
    const params = presetParams(p, game?.slug ?? null);
    setPresetId(next);
    setFields({ source: params.source, medium: params.medium, campaign: params.campaign, content: params.content ?? "" });
    setLanding(game && !p.homeOnly ? "game" : "home");
  }

  const pathError = landing === "custom" && !PATH_RE.test(customPath) ? "Start with / and use a path on this site, e.g. /games/free-fire" : null;
  const landingUrl =
    landing === "game" && game ? `${base}/games/${encodeURIComponent(game.slug)}` : landing === "custom" && !pathError ? `${base}${customPath}` : `${base}/`;
  const missing = !utmValue(fields.source) || !utmValue(fields.medium) || !utmValue(fields.campaign);
  const link = useMemo(() => {
    const tagged = buildUtmLink(landingUrl, fields);
    return landing === "game" && code ? withPromoParam(tagged, code) : tagged;
  }, [landingUrl, fields, landing, code]);

  const field = (key: keyof typeof fields, label: string, hint?: string) => (
    <div className="min-w-0">
      <Label htmlFor={`${id}-${key}`}>
        {label}
        {key === "content" && <span className="ml-1 font-normal text-muted">(optional)</span>}
      </Label>
      <Input
        id={`${id}-${key}`}
        value={fields[key]}
        maxLength={100}
        onChange={(e) => setFields((f) => ({ ...f, [key]: e.target.value }))}
        onBlur={(e) => setFields((f) => ({ ...f, [key]: utmValue(e.target.value) }))}
        aria-invalid={key !== "content" && !utmValue(fields[key]) ? true : undefined}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <div className="min-w-0 lg:col-span-3">
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-fg">Where will you paste the link?</legend>
          <div className="flex flex-wrap gap-2">
            {UTM_PRESETS.map((p) => (
              <label
                key={p.id}
                className={cn(
                  "flex cursor-pointer items-center rounded-xl border px-3 py-2 text-sm transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent",
                  presetId === p.id ? "border-primary bg-primary/15 text-fg" : "border-border bg-surface-2 text-muted hover:text-fg",
                )}
              >
                <input
                  type="radio"
                  name={`${id}-preset`}
                  value={p.id}
                  checked={presetId === p.id}
                  onChange={() => choosePreset(p.id)}
                  className="sr-only"
                />
                {p.label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted">{preset.hint}</p>
        </fieldset>

        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="min-w-0">
            <Label htmlFor={`${id}-landing`}>Landing page</Label>
            <Select id={`${id}-landing`} value={landing} onChange={(e) => setLanding(e.target.value as Landing)}>
              {game && <option value="game">{game.name} page</option>}
              <option value="home">Home page</option>
              <option value="custom">Custom path…</option>
            </Select>
          </div>
          {landing === "custom" ? (
            <div className="min-w-0">
              <Label htmlFor={`${id}-path`}>Path</Label>
              <Input
                id={`${id}-path`}
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value.trim())}
                aria-invalid={pathError ? true : undefined}
                aria-describedby={pathError ? `${id}-path-error` : undefined}
                autoCapitalize="none"
                spellCheck={false}
              />
              {pathError && (
                <p id={`${id}-path-error`} className="mt-1 text-xs text-danger">
                  {pathError}
                </p>
              )}
            </div>
          ) : landing === "game" ? (
            <div className="min-w-0">
              <Label htmlFor={`${id}-code`}>
                Pre-fill promo code <span className="font-normal text-muted">(optional)</span>
              </Label>
              <Select id={`${id}-code`} value={code} onChange={(e) => setCode(e.target.value)}>
                <option value="">None</option>
                {codes.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </div>
          ) : null}
          {field("source", "utm_source", "facebook, messenger, tiktok, telegram…")}
          {field("medium", "utm_medium", "social, paid_social, chat…")}
          {field("campaign", "utm_campaign", "Game slug, promo or season")}
          {field("content", "utm_content", "Which post / video / ad")}
        </div>
      </div>

      <div className="min-w-0 lg:col-span-2">
        <Label htmlFor={`${id}-result`}>Your link</Label>
        <textarea
          id={`${id}-result`}
          readOnly
          value={link}
          rows={4}
          onFocus={(e) => e.currentTarget.select()}
          className="w-full resize-none rounded-xl border border-border bg-bg px-3.5 py-2.5 font-mono text-xs break-all text-fg focus:border-primary focus:ring-2 focus:ring-primary/30 focus:outline-none"
        />
        {missing && <p className="mt-1 text-xs text-danger">utm_source, utm_medium and utm_campaign are required.</p>}
        <div className="mt-2 flex flex-wrap gap-2">
          <CopyTextButton value={link} what="tracking link" variant="primary" size="md" disabled={missing || !!pathError} />
        </div>

        <h3 className="mt-6 text-sm font-semibold text-fg">Quick links{game ? ` for ${game.name}` : ""}</h3>
        <ul className="mt-2 divide-y divide-border/60 rounded-xl border border-border">
          {UTM_PRESETS.map((p) => {
            const url = buildUtmLink(presetLandingUrl(base, p, game?.slug ?? null), presetParams(p, game?.slug ?? null));
            return (
              <li key={p.id} className="flex items-center gap-3 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{p.label}</p>
                  <p className="truncate font-mono text-[11px] text-muted" title={url}>
                    {url.replace(/^https?:\/\//, "")}
                  </p>
                </div>
                <CopyTextButton value={url} what={`${p.label} link`} />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
