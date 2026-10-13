"use client";

import { ChevronRight, History, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { useT } from "@/i18n/client";
import { formatUsd } from "@/lib/utils";
import { formatDateTime } from "./order-status/helpers";
import { normalizeOrderCode, parseRecentOrders, RECENT_ORDERS_KEY } from "./recent-orders";
import { storageRemove, useStoredString } from "./storage";

/** "Enter your order code" form → /orders/<CODE>. */
export function TrackForm() {
  const t = useT();
  const router = useRouter();
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeOrderCode(value);
    if (!code) {
      setError(true);
      return;
    }
    setPending(true);
    router.push(`/orders/${code}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="mt-6">
      <Label htmlFor="orderCode">{t("track.form.label")}</Label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Input
          id="orderCode"
          name="orderCode"
          value={value}
          onChange={(e) => {
            setValue(e.target.value.toUpperCase());
            setError(false);
          }}
          placeholder={t("track.form.placeholder")}
          autoComplete="off"
          autoCapitalize="characters"
          autoCorrect="off"
          spellCheck={false}
          maxLength={24}
          enterKeyHint="go"
          aria-invalid={error || undefined}
          aria-describedby={error ? "orderCode-error" : "orderCode-hint"}
          className="h-12 font-display text-lg tracking-wider uppercase placeholder:font-sans placeholder:text-base placeholder:tracking-normal placeholder:normal-case"
        />
        <Button type="submit" size="lg" loading={pending} className="shrink-0">
          {!pending && <Search className="h-5 w-5" aria-hidden="true" />}
          {t("track.form.submit")}
        </Button>
      </div>
      {error ? (
        <p id="orderCode-error" role="alert" className="mt-2 text-sm text-danger">
          {t("track.form.invalid")}
        </p>
      ) : (
        <p id="orderCode-hint" className="mt-2 text-sm text-muted">
          {t("track.form.hint")}
        </p>
      )}
    </form>
  );
}

/** Orders placed on this device (localStorage "sk_recent_orders"). */
export function RecentOrders() {
  const t = useT();
  const raw = useStoredString(RECENT_ORDERS_KEY);
  const orders = parseRecentOrders(raw);

  return (
    <section aria-labelledby="recent-orders" className="mt-8">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 id="recent-orders" className="flex items-center gap-2 font-display text-lg font-semibold">
          <History className="h-5 w-5 text-accent" aria-hidden="true" />
          {t("track.recent.title")}
        </h2>
        {orders.length > 0 && (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(t("track.recent.clearConfirm"))) storageRemove(RECENT_ORDERS_KEY);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted hover:bg-surface-2 hover:text-fg"
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            {t("track.recent.clear")}
          </button>
        )}
      </div>

      {orders.length === 0 ? (
        <div className="rounded-[var(--radius-card)] border border-dashed border-border px-5 py-8 text-center">
          <p className="font-medium">{t("track.recent.empty")}</p>
          <p className="mt-1 text-sm text-muted">{t("track.recent.emptyHint")}</p>
        </div>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-[var(--radius-card)] border border-border bg-surface">
          {orders.map((o) => (
            <li key={o.code}>
              <Link
                href={`/orders/${o.code}`}
                className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2/60"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-display font-semibold tracking-wider">{o.code}</p>
                  <p className="truncate text-sm text-muted">
                    {[o.gameName, o.packageName].filter(Boolean).join(" · ") || t("track.recent.unknown")}
                  </p>
                </div>
                <div className="shrink-0 text-right text-sm">
                  {o.totalCents != null && <p className="font-semibold">{formatUsd(o.totalCents)}</p>}
                  {o.createdAt && <p className="text-xs text-muted">{formatDateTime(o.createdAt)}</p>}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted" aria-hidden="true" />
                <span className="sr-only">{t("track.recent.view")}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
