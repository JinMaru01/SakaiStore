"use client";

import { CircleAlert, CircleCheck, CircleHelp, ChevronDown, TriangleAlert, UserRoundSearch } from "lucide-react";
import { Button, Input, Label, Select } from "@/components/ui";
import { useT } from "@/i18n/client";
import { cn } from "@/lib/utils";
import { errorMessage } from "../api";
import { Step } from "./step";
import type { FormGame, LookupState } from "./types";
import { isNumericPattern, usesZone, type FieldIssue } from "./validation";

type Props = {
  game: FormGame;
  playerId: string;
  zoneId: string;
  idIssue: FieldIssue | null;
  zoneIssue: FieldIssue | null;
  /** Server-side field error code (invalid_id / invalid_zone) from the last submit. */
  serverField: { field: "playerId" | "zoneId"; error: string } | null;
  lookup: LookupState | null;
  /**
   * Whether this store can look up player names (PLAYER_LOOKUP_MODE ≠ none).
   * Without it there is no "Check player name" button: a format check must
   * never look like a confirmed account, so a standing warning asks the
   * customer to double-check the ID instead.
   */
  nameLookup: boolean;
  remembered: boolean;
  onPlayerIdChange: (v: string) => void;
  onZoneChange: (v: string) => void;
  onBlur: (field: "playerId" | "zoneId") => void;
  onCheck: () => void;
  onForget: () => void;
};

export function AccountStep({
  game,
  playerId,
  zoneId,
  idIssue,
  zoneIssue,
  serverField,
  lookup,
  nameLookup,
  remembered,
  onPlayerIdChange,
  onZoneChange,
  onBlur,
  onCheck,
  onForget,
}: Props) {
  const t = useT();
  const hasZone = usesZone(game);
  const options = game.zoneOptions ?? [];
  const zoneLabel = game.zoneLabel || t("game.account.zoneDefault");

  const idError =
    serverField?.field === "playerId"
      ? errorMessage(t, "game.errors", serverField.error)
      : idIssue === "required"
        ? t("game.account.required", { label: game.idLabel })
        : idIssue === "invalid"
          ? t("game.account.invalid", { label: game.idLabel })
          : null;
  const zoneError =
    serverField?.field === "zoneId"
      ? errorMessage(t, "game.errors", serverField.error)
      : zoneIssue === "required"
        ? t("game.account.required", { label: zoneLabel })
        : zoneIssue === "invalid"
          ? t("game.account.invalid", { label: zoneLabel })
          : null;
  const idDescribedBy = [idError && "playerId-error", !nameLookup && "playerId-note"].filter(Boolean).join(" ");

  return (
    <Step n={1} id="step-account" title={t("game.steps.account")}>
      <div className={cn("grid gap-3", hasZone && "grid-cols-[minmax(0,1fr)_minmax(0,9rem)] sm:grid-cols-[minmax(0,1fr)_11rem]")}>
        <div>
          <Label htmlFor="playerId">{game.idLabel}</Label>
          <Input
            id="playerId"
            name="playerId"
            value={playerId}
            onChange={(e) => onPlayerIdChange(e.target.value)}
            onBlur={() => onBlur("playerId")}
            inputMode={isNumericPattern(game.idPattern) ? "numeric" : "text"}
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="next"
            maxLength={80}
            placeholder={t("game.account.idPlaceholder", { label: game.idLabel })}
            aria-invalid={idError ? true : undefined}
            aria-describedby={idDescribedBy || undefined}
            aria-required="true"
            className="text-base"
          />
          {idError && (
            <p id="playerId-error" className="mt-1.5 text-sm text-danger">
              {idError}
            </p>
          )}
        </div>

        {hasZone && (
          <div>
            <Label htmlFor="zoneId">
              {zoneLabel}
              {!game.requiresZone && <span className="font-normal text-muted"> ({t("game.optional")})</span>}
            </Label>
            {options.length > 0 ? (
              <div className="relative">
                <Select
                  id="zoneId"
                  name="zoneId"
                  value={zoneId}
                  onChange={(e) => onZoneChange(e.target.value)}
                  onBlur={() => onBlur("zoneId")}
                  aria-invalid={zoneError ? true : undefined}
                  aria-describedby={zoneError ? "zoneId-error" : undefined}
                  className="text-base"
                >
                  <option value="">{t("game.account.zoneSelect")}</option>
                  {options.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
                <ChevronDown
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-muted"
                  aria-hidden="true"
                />
              </div>
            ) : (
              <Input
                id="zoneId"
                name="zoneId"
                value={zoneId}
                onChange={(e) => onZoneChange(e.target.value)}
                onBlur={() => onBlur("zoneId")}
                inputMode={isNumericPattern(game.zonePattern) ? "numeric" : "text"}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                maxLength={40}
                placeholder={zoneLabel}
                aria-invalid={zoneError ? true : undefined}
                aria-describedby={zoneError ? "zoneId-error" : undefined}
                className="text-base"
              />
            )}
            {zoneError && (
              <p id="zoneId-error" className="mt-1.5 text-sm text-danger">
                {zoneError}
              </p>
            )}
          </div>
        )}
      </div>

      {remembered && (
        <p className="mt-2 flex flex-wrap items-center gap-x-2 text-xs text-muted">
          {t("game.account.remembered")}
          <button type="button" onClick={onForget} className="font-medium text-primary underline-offset-2 hover:underline">
            {t("game.account.forget")}
          </button>
        </p>
      )}

      {!nameLookup && (
        <p
          id="playerId-note"
          className="mt-3 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-fg"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
          <span>{t("game.account.noNameCheck", { label: game.idLabel })}</span>
        </p>
      )}

      {game.idHelp && (
        <details className="group mt-4 rounded-xl border border-border bg-surface-2/50">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3.5 py-2.5 text-sm font-medium text-fg [&::-webkit-details-marker]:hidden">
            <CircleHelp className="h-4 w-4 text-accent" aria-hidden="true" />
            <span className="flex-1">{t("game.account.howToFind", { label: game.idLabel })}</span>
            <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" aria-hidden="true" />
          </summary>
          <p className="px-3.5 pb-3.5 text-sm leading-relaxed text-muted">{game.idHelp}</p>
        </details>
      )}

      {nameLookup && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={onCheck}
            loading={lookup?.status === "loading"}
            className="sm:w-auto"
          >
            {lookup?.status !== "loading" && <UserRoundSearch className="h-4 w-4" aria-hidden="true" />}
            {lookup?.status === "loading" ? t("game.account.checking") : t("game.account.check")}
          </Button>
          <div role="status" aria-live="polite" className="text-sm sm:min-h-5">
            {lookup?.status === "ok" &&
              (lookup.outcome === "found" && lookup.playerName ? (
                <p className="flex items-center gap-1.5 text-success">
                  <CircleCheck className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>
                    {t("game.account.playerFound")} <strong className="font-semibold text-fg">{lookup.playerName}</strong>
                  </span>
                </p>
              ) : (
                // Only the ID format was checked: a warning, never a green "confirmed" state.
                <p className="flex items-start gap-1.5 text-fg">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden="true" />
                  <span>
                    {t(lookup.outcome === "format_only" ? "game.account.formatOnly" : "game.account.lookupUnavailable")}
                  </span>
                </p>
              ))}
            {lookup?.status === "error" && (
              <p className="flex items-center gap-1.5 text-danger">
                <CircleAlert className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{errorMessage(t, "game.lookupErrors", lookup.error)}</span>
              </p>
            )}
          </div>
        </div>
      )}
    </Step>
  );
}
