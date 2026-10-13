"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PublicOrder } from "@/lib/orders/public";
import { apiRequest } from "../api";
import { pollIntervalFor } from "./helpers";

/**
 * Keeps an order fresh by polling GET /api/orders/[code] (which also asks the
 * bank whether a pending KHQR was paid). Polls every 4s while the order is
 * moving, slowly for a while after it expired (a late payment can still
 * arrive), pauses while the tab is hidden, resumes immediately when it becomes
 * visible again, and stops on final statuses.
 */
export function useOrderPolling(initial: PublicOrder) {
  const [order, setOrder] = useState(initial);
  const [offline, setOffline] = useState(false);
  const inFlight = useRef<AbortController | null>(null);
  const code = initial.code;

  const refresh = useCallback(async () => {
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    try {
      const res = await apiRequest<{ order: PublicOrder }>(`/api/orders/${encodeURIComponent(code)}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      if (res.ok) {
        if (res.data?.order) setOrder(res.data.order);
        setOffline(false);
      } else {
        setOffline(res.error === "network");
      }
    } catch {
      // aborted: a newer request or unmount took over
    } finally {
      if (inFlight.current === controller) inFlight.current = null;
    }
  }, [code]);

  const status = order.status;
  const expiresAt = order.paymentExpiresAt;
  useEffect(() => {
    // Re-evaluated before every poll: expired orders stop once their late-payment window is over.
    const nextInterval = () => pollIntervalFor(status, expiresAt, Date.now());
    if (nextInterval() == null) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let stopped = false;

    const schedule = () => {
      clearTimeout(timer);
      const interval = nextInterval();
      if (interval != null) timer = setTimeout(tick, interval);
    };
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === "hidden") return; // resumed by onVisible
      await refresh();
      if (!stopped) schedule();
    };
    const onVisible = () => {
      if (document.visibilityState === "visible" && !stopped) {
        clearTimeout(timer);
        void tick();
      }
    };

    schedule();
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, expiresAt, refresh]);

  // Abort any request still running when the page unmounts.
  useEffect(() => () => inFlight.current?.abort(), []);

  return { order, setOrder, refresh, offline };
}
