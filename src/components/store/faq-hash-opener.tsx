"use client";

import { useEffect } from "react";

/**
 * Opens the FAQ entry targeted by the URL hash (e.g. /faq#faq-notReceived,
 * linked from the Track page) — browsers scroll to a closed <details> but do
 * not expand it.
 */
export function FaqHashOpener() {
  useEffect(() => {
    const open = () => {
      const id = decodeURIComponent(window.location.hash.slice(1));
      if (!id.startsWith("faq-")) return;
      const el = document.getElementById(id);
      if (el instanceof HTMLDetailsElement) {
        el.open = true;
        el.scrollIntoView({ block: "start" });
      }
    };
    open();
    window.addEventListener("hashchange", open);
    return () => window.removeEventListener("hashchange", open);
  }, []);
  return null;
}
