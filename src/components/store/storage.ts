"use client";

import { useSyncExternalStore } from "react";

/**
 * localStorage access that never throws. In-app browsers (Facebook, TikTok),
 * private windows and blocked site data can make storage unavailable; the
 * storefront must keep working without it.
 */

const CHANGE_EVENT = "sk-storage";

export function storageGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function storageSet(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
    return true;
  } catch {
    return false;
  }
}

export function storageRemove(key: string): void {
  try {
    window.localStorage.removeItem(key);
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: key }));
  } catch {
    // ignore
  }
}

function subscribe(onChange: () => void) {
  // "storage" fires for other tabs; our custom event covers this tab.
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

/**
 * Raw localStorage value, kept in sync across tabs. Returns null during SSR
 * and hydration, so server and client markup always match.
 */
export function useStoredString(key: string): string | null {
  return useSyncExternalStore(
    subscribe,
    () => storageGet(key),
    () => null,
  );
}
