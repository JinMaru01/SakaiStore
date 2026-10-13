import { CircleCheck, CircleMinus, TriangleAlert } from "lucide-react";
import type { IntegrationGroup, IntegrationLevel } from "@/lib/admin/integrations";
import { cn } from "@/lib/utils";

const LEVEL: Record<IntegrationLevel, { icon: typeof CircleCheck; className: string; sr: string }> = {
  ok: { icon: CircleCheck, className: "text-success", sr: "OK" },
  warn: { icon: TriangleAlert, className: "text-warning", sr: "Needs attention" },
  off: { icon: CircleMinus, className: "text-muted", sr: "Off" },
};

/** Read-only environment status (never shows secret values — see getIntegrationStatus). */
export function IntegrationStatus({ groups }: { groups: IntegrationGroup[] }) {
  return (
    <div className="grid grid-cols-1 gap-5">
      {groups.map((group) => (
        <section key={group.title} aria-label={group.title}>
          <h3 className="mb-1 text-xs font-semibold tracking-wide text-muted uppercase">{group.title}</h3>
          <ul className="divide-y divide-border/60">
            {group.items.map((item) => {
              const level = LEVEL[item.level];
              const Icon = level.icon;
              return (
                <li key={item.label} className="py-2.5">
                  <div className="flex items-start gap-2.5">
                    <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", level.className)} aria-hidden="true" />
                    <span className="min-w-0 flex-1 text-sm text-fg">{item.label}</span>
                    <span className={cn("shrink-0 text-sm", item.level === "ok" ? "text-fg" : level.className)}>
                      <span className="sr-only">{level.sr}: </span>
                      {item.value}
                    </span>
                  </div>
                  {item.hint && <p className="mt-1 ml-6.5 text-xs text-muted">{item.hint}</p>}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
