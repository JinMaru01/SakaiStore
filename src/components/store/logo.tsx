import { cn } from "@/lib/utils";

/**
 * Sakai Store mark: an original faceted gem (the "diamonds" every top-up is
 * about) on the brand gradient. Keep in sync with src/app/icon.svg.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-[30%] bg-brand-gradient",
        "shadow-[0_6px_20px_-6px_rgb(124_92_255/0.7)]",
        className ?? "h-9 w-9",
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 32 32" className="h-[78%] w-[78%]" fill="none">
        <path d="M9.5 8h13l4.5 5.5L16 26 5 13.5z" fill="#fff" fillOpacity=".22" />
        <path d="M5 13.5h22L16 26z" fill="#fff" fillOpacity=".35" />
        <path d="M13 13.5 16 8l3 5.5L16 26z" fill="#fff" fillOpacity=".55" />
        <path
          d="M9.5 8h13l4.5 5.5L16 26 5 13.5zM5 13.5h22M9.5 8l3.5 5.5L16 26l3-12.5L22.5 8M13 13.5 16 8l3 5.5"
          stroke="#fff"
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Mark + store name. The last word of the name gets the brand gradient. */
export function Logo({ name, className }: { name: string; className?: string }) {
  const words = name.trim().split(/\s+/);
  const head = words.length > 1 ? words.slice(0, -1).join(" ") : name;
  const tail = words.length > 1 ? words[words.length - 1] : "";
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark />
      <span className="font-display text-lg font-bold leading-none tracking-tight whitespace-nowrap">
        {head}
        {tail && <span className="text-brand-gradient"> {tail}</span>}
      </span>
    </span>
  );
}
