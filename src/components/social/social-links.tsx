import { BRAND_ICONS, BRAND_LABELS } from "@/components/icons/brand";
import type { SocialSettings } from "@/lib/settings";
import { cn } from "@/lib/utils";
import { FOLLOW_NETWORKS, socialLinks, type SocialNetwork } from "./social-config";

const HOVER: Record<SocialNetwork, string> = {
  facebook: "hover:text-facebook hover:border-facebook/50",
  tiktok: "hover:text-tiktok hover:border-tiktok/50",
  telegram: "hover:text-telegram hover:border-telegram/50",
  messenger: "hover:text-messenger hover:border-messenger/50",
  youtube: "hover:text-[#ff0033] hover:border-[#ff0033]/50",
  instagram: "hover:text-[#e1306c] hover:border-[#e1306c]/50",
};

type Props = {
  social: SocialSettings;
  networks?: SocialNetwork[];
  /** Accessible label pattern, e.g. "{network} (opens in a new tab)". */
  labelTemplate?: string;
  size?: "sm" | "md";
  className?: string;
};

/** Row of social icon links. Only configured networks render; nothing renders when none are set. */
export function SocialLinks({ social, networks = FOLLOW_NETWORKS, labelTemplate, size = "md", className }: Props) {
  const links = socialLinks(social, networks);
  if (links.length === 0) return null;
  return (
    <ul className={cn("flex flex-wrap items-center gap-2", className)}>
      {links.map(({ network, url }) => {
        const Icon = BRAND_ICONS[network];
        const name = BRAND_LABELS[network];
        return (
          <li key={network}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={labelTemplate ? labelTemplate.replace("{network}", name) : name}
              title={name}
              className={cn(
                "grid place-items-center rounded-xl border border-border bg-surface-2/60 text-muted transition-colors",
                size === "sm" ? "h-9 w-9" : "h-10 w-10",
                HOVER[network],
              )}
            >
              <Icon className={size === "sm" ? "h-4 w-4" : "h-[18px] w-[18px]"} />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
