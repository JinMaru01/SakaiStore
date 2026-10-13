"use client";

import { Check } from "lucide-react";
import { Spinner } from "@/components/ui";
import { useT } from "@/i18n/client";
import type { OrderStatus } from "@/lib/orders/status";
import { cn } from "@/lib/utils";

const STEPS = ["paid", "delivering", "delivered"] as const;

/** Paid → Delivering → Delivered tracker shown once money is received. */
export function ProgressSteps({ status }: { status: OrderStatus }) {
  const t = useT();
  // Index of the step currently in progress (3 = all done).
  const current = status === "delivered" ? 3 : 1;
  return (
    <ol className="grid grid-cols-3" aria-label={t("order.progress.label")}>
      {STEPS.map((step, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={step} className="flex flex-col items-center text-center" aria-current={active ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "opacity-0" : done || active ? "bg-success" : "bg-border")} />
              <span
                className={cn(
                  "grid h-10 w-10 shrink-0 place-items-center rounded-full ring-4 ring-surface",
                  done && "bg-success text-white",
                  active && "bg-primary/20 text-primary",
                  !done && !active && "bg-surface-2 text-muted",
                )}
              >
                {done ? (
                  <Check className="h-5 w-5" aria-hidden="true" />
                ) : active ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <span className="font-display text-sm font-bold">{i + 1}</span>
                )}
              </span>
              <span
                className={cn("h-0.5 flex-1", i === STEPS.length - 1 ? "opacity-0" : done ? "bg-success" : "bg-border")}
              />
            </div>
            <span
              className={cn("mt-2 px-1 text-xs font-medium sm:text-sm", done || active ? "text-fg" : "text-muted")}
            >
              {t(`order.progress.${step}`)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
