"use client";

import { useSyncExternalStore } from "react";

/*
 * One shared 1-second clock for countdowns. Returns null during SSR and
 * hydration so the server markup never contains a time that is already stale.
 */
let now = 0;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = Date.now();
    timer = setInterval(() => {
      now = Date.now();
      for (const l of listeners) l();
    }, 1000);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

function getSnapshot() {
  if (!now) now = Date.now();
  return now;
}

export function useNow(): number | null {
  const value = useSyncExternalStore(subscribe, getSnapshot, () => 0);
  return value || null;
}
