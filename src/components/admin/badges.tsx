import { Globe, Link2, MousePointerClick, Search } from "lucide-react";
import { FacebookIcon, TelegramIcon, TikTokIcon } from "@/components/icons/brand";
import { Badge, StatusBadge } from "@/components/ui";
import type { Channel } from "@/lib/attribution";
import { STATUS_LABELS, type OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

/** Order status pill with the English admin label. */
export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return <StatusBadge status={status}>{STATUS_LABELS[status]}</StatusBadge>;
}

export const CHANNEL_LABELS: Record<Channel, string> = {
  facebook: "Facebook",
  tiktok: "TikTok",
  telegram: "Telegram",
  google: "Google",
  direct: "Direct",
  other: "Other",
};

type IconComponent = React.ComponentType<{ className?: string }>;

const CHANNEL_ICONS: Record<Channel, IconComponent> = {
  facebook: FacebookIcon,
  tiktok: TikTokIcon,
  telegram: TelegramIcon,
  google: Search,
  direct: MousePointerClick,
  other: Globe,
};

/** Brand color for the channel icon (identity only; text stays in text tokens). */
const CHANNEL_ICON_COLORS: Record<Channel, string> = {
  facebook: "text-facebook",
  tiktok: "text-tiktok",
  telegram: "text-telegram",
  google: "text-fg",
  direct: "text-muted",
  other: "text-muted",
};

export function channelLabel(channel: string): string {
  return CHANNEL_LABELS[channel as Channel] ?? channel;
}

/** Channel icon (decorative) for lists where the label is printed next to it. */
export function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
  const Icon = CHANNEL_ICONS[channel as Channel] ?? Link2;
  return (
    <Icon
      aria-hidden="true"
      className={cn("h-4 w-4 shrink-0", CHANNEL_ICON_COLORS[channel as Channel] ?? "text-muted", className)}
    />
  );
}

/** Icon + label chip for a marketing channel. */
export function ChannelBadge({ channel }: { channel: string }) {
  return (
    <Badge className="gap-1.5">
      <ChannelIcon channel={channel} className="h-3.5 w-3.5" />
      {channelLabel(channel)}
    </Badge>
  );
}
