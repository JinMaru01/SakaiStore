/**
 * CSV writing for admin exports (RFC 4180: comma separated, CRLF line ends,
 * fields with quotes/commas/newlines wrapped in double quotes).
 *
 * Exports are opened in Excel / Google Sheets, and some cells come straight
 * from customers (player id, player name, Telegram handle, utm values). A cell
 * starting with = + - @ (or tab / carriage return) is interpreted as a formula
 * by spreadsheet apps — "CSV injection" — so such text cells are prefixed with
 * a single quote, which spreadsheets treat as "this is text".
 * Pure; safe for server and client.
 */

export const CSV_BOM = "﻿";
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[",\r\n]/;

/** Escape one CSV cell. Numbers are written as-is; text gets the formula guard. */
export function escapeCsvCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "bigint") return value.toString();
  if (typeof value === "boolean") return value ? "true" : "false";
  let text = value instanceof Date ? value.toISOString() : String(value);
  if (FORMULA_START.test(text)) text = `'${text}`;
  if (NEEDS_QUOTES.test(text)) text = `"${text.replace(/"/g, '""')}"`;
  return text;
}

export type CsvColumn<T> = { header: string; value: (row: T) => unknown };

/** Header row + one line per row, CRLF separated (with a trailing CRLF). */
export function toCsv<T>(rows: readonly T[], columns: readonly CsvColumn<T>[]): string {
  const lines = [columns.map((c) => escapeCsvCell(c.header)).join(",")];
  for (const row of rows) lines.push(columns.map((c) => escapeCsvCell(c.value(row))).join(","));
  return `${lines.join("\r\n")}\r\n`;
}
