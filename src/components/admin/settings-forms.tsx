"use client";

import { Save } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Input, Textarea } from "@/components/ui";
import type { MarketingSettings, SocialSettings, StoreSettings } from "@/lib/settings";
import { Field } from "./field";
import { fieldError } from "./form-message";
import { SubmitButton } from "./submit-button";
import { useAdminAction, type AdminAction } from "./use-admin-action";

function SectionCard({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action: AdminAction;
  children: (err: (name: string) => string | undefined) => React.ReactNode;
}) {
  const { state, pending, onSubmit } = useAdminAction(action);
  return (
    <Card>
      <form onSubmit={onSubmit} noValidate>
        <CardHeader className="items-start">
          <div>
            <CardTitle>{title}</CardTitle>
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4">
          {children((name) => fieldError(state, name))}
          <div>
            <SubmitButton pending={pending}>
              <Save className="h-4 w-4" aria-hidden="true" />
              Save {title.toLowerCase()}
            </SubmitButton>
          </div>
        </CardContent>
      </form>
    </Card>
  );
}

export function StoreSettingsForm({ values, action }: { values: StoreSettings; action: AdminAction }) {
  return (
    <SectionCard title="Store" description="Name, tagline and support contacts shown across the site." action={action}>
      {(err) => (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Store name" error={err("name")}>
              <Input name="name" defaultValue={values.name} maxLength={60} required />
            </Field>
            <Field label="KHR per USD" error={err("khrPerUsd")} hint="Display only — prices are charged in USD.">
              <Input name="khrPerUsd" defaultValue={values.khrPerUsd} inputMode="numeric" />
            </Field>
            <Field label="Tagline (English)" error={err("tagline.en")}>
              <Input name="tagline.en" defaultValue={values.tagline.en} maxLength={500} />
            </Field>
            <Field label="Tagline (Khmer)" error={err("tagline.km")}>
              <Input name="tagline.km" defaultValue={values.tagline.km} maxLength={500} lang="km" />
            </Field>
            <Field label="Announcement bar (English)" error={err("announcement.en")} optional hint="Empty hides the bar.">
              <Textarea name="announcement.en" defaultValue={values.announcement.en} maxLength={500} rows={2} />
            </Field>
            <Field label="Announcement bar (Khmer)" error={err("announcement.km")} optional>
              <Textarea name="announcement.km" defaultValue={values.announcement.km} maxLength={500} rows={2} lang="km" />
            </Field>
            <Field label="Support phone" error={err("supportPhone")} optional>
              <Input name="supportPhone" type="tel" defaultValue={values.supportPhone} maxLength={32} placeholder="012 345 678" />
            </Field>
            <Field label="Support Telegram username" error={err("supportTelegram")} optional hint="Without @">
              <Input
                name="supportTelegram"
                defaultValue={values.supportTelegram}
                maxLength={64}
                autoCapitalize="none"
                spellCheck={false}
                placeholder="sakaistore_support"
              />
            </Field>
          </div>
        </>
      )}
    </SectionCard>
  );
}

const SOCIAL_FIELDS: { name: keyof SocialSettings; label: string; placeholder: string; hint?: string }[] = [
  { name: "facebookUrl", label: "Facebook Page", placeholder: "https://www.facebook.com/yourpage" },
  { name: "tiktokUrl", label: "TikTok", placeholder: "https://www.tiktok.com/@yourname" },
  { name: "messengerUrl", label: "Messenger chat", placeholder: "https://m.me/yourpage", hint: "Powers the floating chat button." },
  { name: "telegramUrl", label: "Telegram", placeholder: "https://t.me/yourchannel" },
  { name: "youtubeUrl", label: "YouTube", placeholder: "https://www.youtube.com/@yourchannel" },
  { name: "instagramUrl", label: "Instagram", placeholder: "https://www.instagram.com/yourname" },
];

export function SocialSettingsForm({ values, action }: { values: SocialSettings; action: AdminAction }) {
  return (
    <SectionCard title="Social links" description="Shown in the header, footer, “Follow us” and chat buttons. Empty = hidden." action={action}>
      {(err) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {SOCIAL_FIELDS.map((f) => (
            <Field key={f.name} label={f.label} error={err(f.name)} optional hint={f.hint}>
              <Input
                name={f.name}
                type="url"
                inputMode="url"
                defaultValue={values[f.name]}
                maxLength={500}
                placeholder={f.placeholder}
                autoCapitalize="none"
                spellCheck={false}
              />
            </Field>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export function MarketingSettingsForm({ values, action }: { values: MarketingSettings; action: AdminAction }) {
  return (
    <SectionCard title="Marketing" description="Used by the “Follow us” section and the caption generator." action={action}>
      {(err) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Follower promo code"
            error={err("followPromoCode")}
            optional
            hint="Advertised to people who follow your Page / TikTok, e.g. FOLLOW10."
          >
            <Input
              name="followPromoCode"
              defaultValue={values.followPromoCode}
              maxLength={32}
              autoCapitalize="characters"
              spellCheck={false}
              className="font-mono uppercase"
            />
          </Field>
          <Field label="Default hashtags" error={err("defaultHashtags")} optional hint="Appended to every generated caption.">
            <Textarea name="defaultHashtags" defaultValue={values.defaultHashtags} maxLength={300} rows={2} />
          </Field>
        </div>
      )}
    </SectionCard>
  );
}
