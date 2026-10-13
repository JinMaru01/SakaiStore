import { BookOpen, CircleCheck, CircleDashed } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import type { ChecklistItem } from "@/lib/marketing/checklist";
import { cn } from "@/lib/utils";

export const PLAYBOOK_PATH = "/admin/marketing/playbook";

/** "Ready to promote?" — live status of the Facebook/TikTok setup with links to fix each item. */
export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const done = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((done / items.length) * 100) : 0;
  return (
    <Card>
      <CardHeader className="items-start">
        <div>
          <CardTitle>Setup checklist</CardTitle>
          <p className="mt-0.5 text-sm text-muted">
            {done === items.length ? "Everything is set — go post!" : `${done} of ${items.length} done`}
          </p>
        </div>
        <Link href={PLAYBOOK_PATH} className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-primary hover:text-fg">
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Playbook
        </Link>
      </CardHeader>
      <CardContent>
        <div
          className="h-2 overflow-hidden rounded-full bg-surface-3"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={items.length}
          aria-valuenow={done}
          aria-label="Setup progress"
        >
          <div className="h-full rounded-full bg-success transition-[width]" style={{ width: `${pct}%` }} />
        </div>
        <ul className="mt-4 divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.id} className="py-3 first:pt-0 last:pb-0">
              <div className="flex items-start gap-3">
                {item.done ? (
                  <CircleCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
                ) : (
                  <CircleDashed className="mt-0.5 h-5 w-5 shrink-0 text-warning" aria-hidden="true" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-fg">
                    <span className="sr-only">{item.done ? "Done: " : "To do: "}</span>
                    {item.label}
                  </p>
                  <p className={cn("mt-0.5 text-sm break-words", item.done ? "text-muted" : "text-fg/80")}>{item.detail}</p>
                  <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                    {!item.done && item.action && (
                      <Link href={item.action.href} className="font-medium text-primary hover:text-fg">
                        {item.action.label}
                      </Link>
                    )}
                    <Link href={`${PLAYBOOK_PATH}#${item.playbook}`} className="text-muted hover:text-fg">
                      How-to
                      <span className="sr-only"> for {item.label}</span>
                    </Link>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
