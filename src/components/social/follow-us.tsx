import { BadgePercent } from "lucide-react";
import { FacebookIcon, TelegramIcon, TikTokIcon } from "@/components/icons/brand";
import { CopyButton } from "@/components/store/copy-button";
import { getT } from "@/i18n/server";
import type { MarketingSettings, SocialSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { socialLinks, type SocialNetwork } from "./social-config";

const BUTTONS: Record<
  Extract<SocialNetwork, "facebook" | "tiktok" | "telegram">,
  { key: string; Icon: typeof FacebookIcon; className: string }
> = {
  facebook: {
    key: "social.follow.facebook",
    Icon: FacebookIcon,
    className: "bg-facebook text-white hover:brightness-110",
  },
  tiktok: {
    key: "social.follow.tiktok",
    Icon: TikTokIcon,
    className:
      "bg-black text-white ring-1 ring-white/15 hover:ring-white/30 shadow-[-2px_-2px_0_0_rgb(37_244_238/0.55),2px_2px_0_0_rgb(254_44_85/0.55)]",
  },
  telegram: {
    key: "social.follow.telegram",
    Icon: TelegramIcon,
    className: "bg-telegram text-white hover:brightness-110",
  },
};

type Props = {
  social: SocialSettings;
  marketing: Pick<MarketingSettings, "followPromoCode">;
  /** "section" for the home page, "card" for compact placements (order success). */
  variant?: "section" | "card";
  className?: string;
  /** Heading level id for aria-labelledby (unique per page). */
  id?: string;
};

/**
 * "Follow us on Facebook & TikTok" call to action with the follower promo
 * code. Grows the page audience at the moments customers are happiest.
 * Renders nothing when no social links and no code are configured.
 */
export async function FollowUs({ social, marketing, variant = "section", className, id = "follow-us" }: Props) {
  const { t } = await getT();
  const links = socialLinks(social, ["facebook", "tiktok", "telegram"]);
  const code = marketing.followPromoCode.trim().toUpperCase();
  if (links.length === 0 && !code) return null;
  const compact = variant === "card";

  return (
    <section
      aria-labelledby={id}
      className={cn(
        "relative overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface",
        compact ? "p-5" : "p-6 sm:p-10",
        className,
      )}
    >
      {/* Brand glow (decorative) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -right-16 h-64 w-64 rounded-full bg-facebook/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-tiktok/15 blur-3xl"
      />

      <div className={cn("relative", !compact && "mx-auto max-w-2xl text-center")}>
        <h2 id={id} className={cn("font-display font-bold", compact ? "text-lg" : "text-2xl sm:text-3xl")}>
          {t("social.follow.title")}
        </h2>
        <p className={cn("mt-2 text-muted", compact ? "text-sm" : "sm:text-lg")}>{t("social.follow.body")}</p>

        {links.length > 0 && (
          <ul
            className={cn(
              "mt-5 grid gap-3",
              compact ? "grid-cols-1 sm:grid-cols-3" : "sm:grid-cols-3",
              links.length === 1 && "sm:grid-cols-1",
              links.length === 2 && "sm:grid-cols-2",
            )}
          >
            {links.map(({ network, url }) => {
              const b = BUTTONS[network as keyof typeof BUTTONS];
              return (
                <li key={network}>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "flex h-12 items-center justify-center gap-2.5 rounded-xl px-4 font-semibold transition",
                      b.className,
                    )}
                  >
                    <b.Icon className="h-5 w-5" />
                    <span>{t(b.key)}</span>
                    <span className="sr-only">{t("social.newTab")}</span>
                  </a>
                </li>
              );
            })}
          </ul>
        )}

        {code && (
          <div
            className={cn(
              "mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-primary/50 bg-primary/10 p-3",
              !compact && "justify-center",
            )}
          >
            <BadgePercent className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm sm:text-base">
              {t("social.follow.promoBefore")}{" "}
              <code className="rounded-md bg-bg/60 px-2 py-0.5 font-display font-bold tracking-wider text-accent">
                {code}
              </code>
            </p>
            <CopyButton
              value={code}
              label={t("social.follow.copyCode")}
              ariaLabel={t("social.follow.copyCodeAria", { code })}
            />
          </div>
        )}
      </div>
    </section>
  );
}
