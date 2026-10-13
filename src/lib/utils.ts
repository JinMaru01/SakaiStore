import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format integer USD cents as "$1.50". */
export function formatUsd(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(Math.round(cents));
  return `${sign}$${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Approximate KHR display value for USD cents using the store exchange rate. */
export function formatKhr(cents: number, khrPerUsd: number): string {
  const riel = Math.round(((cents / 100) * khrPerUsd) / 100) * 100; // round to 100៛
  return `${riel.toLocaleString("en-US")}៛`;
}

/** Convert "1.50" / "1.5" / "$2" to integer cents; returns null if invalid. */
export function parseUsdToCents(input: string): number | null {
  const s = input.trim().replace(/^\$/, "");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [whole, frac = ""] = s.split(".");
  return Number(whole) * 100 + Number(frac.padEnd(2, "0"));
}

/** Compact number: 1234 -> "1,234". */
export function formatNumber(n: number): string {
  return n.toLocaleString("en-US");
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
