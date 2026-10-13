"use client";

import { Input, Label } from "@/components/ui";
import { useT } from "@/i18n/client";
import { Step } from "./step";

/** Loose formats; the server stores contact details as plain text. */
export const PHONE_RE = /^\+?[\d\s-]{6,20}$/;
export const TELEGRAM_RE = /^@?[A-Za-z0-9_]{4,32}$/;

type Props = {
  phone: string;
  telegram: string;
  showErrors: boolean;
  onPhoneChange: (v: string) => void;
  onTelegramChange: (v: string) => void;
};

export function ContactStep({ phone, telegram, showErrors, onPhoneChange, onTelegramChange }: Props) {
  const t = useT();
  const phoneError = showErrors && phone.trim() !== "" && !PHONE_RE.test(phone.trim());
  const tgError = showErrors && telegram.trim() !== "" && !TELEGRAM_RE.test(telegram.trim());

  return (
    <Step
      n={4}
      id="step-contact"
      title={t("game.steps.contact")}
      optional={t("game.optional")}
      hint={t("game.contact.hint")}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label htmlFor="contactPhone">{t("game.contact.phone")}</Label>
          <Input
            id="contactPhone"
            name="contactPhone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="012 345 678"
            maxLength={24}
            aria-invalid={phoneError || undefined}
            aria-describedby={phoneError ? "contactPhone-error" : undefined}
            className="text-base"
          />
          {phoneError && (
            <p id="contactPhone-error" className="mt-1.5 text-sm text-danger">
              {t("game.contact.phoneInvalid")}
            </p>
          )}
        </div>
        <div>
          <Label htmlFor="contactTelegram">{t("game.contact.telegram")}</Label>
          <Input
            id="contactTelegram"
            name="contactTelegram"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            value={telegram}
            onChange={(e) => onTelegramChange(e.target.value)}
            placeholder="@username"
            maxLength={33}
            aria-invalid={tgError || undefined}
            aria-describedby={tgError ? "contactTelegram-error" : undefined}
            className="text-base"
          />
          {tgError && (
            <p id="contactTelegram-error" className="mt-1.5 text-sm text-danger">
              {t("game.contact.telegramInvalid")}
            </p>
          )}
        </div>
      </div>
    </Step>
  );
}
