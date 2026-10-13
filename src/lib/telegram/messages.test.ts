import { describe, expect, it } from "vitest";
import { BOT_STRINGS, fill } from "./messages";
import { checkTelegramHtml } from "./telegram-html";

type Tree = { [k: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (typeof v === "string") out[key] = v;
    else Object.assign(out, flatten(v, key));
  }
  return out;
}

const placeholders = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

describe("bot strings", () => {
  const en = flatten(BOT_STRINGS.en as unknown as Tree);
  const km = flatten(BOT_STRINGS.km as unknown as Tree);

  it("have identical keys in English and Khmer", () => {
    expect(Object.keys(km).sort()).toEqual(Object.keys(en).sort());
  });

  it("use the same placeholders in both languages", () => {
    for (const key of Object.keys(en)) expect(placeholders(km[key]!), key).toEqual(placeholders(en[key]!));
  });

  it("are valid Telegram HTML and the Khmer texts are actually Khmer", () => {
    for (const [key, value] of [...Object.entries(en), ...Object.entries(km)]) {
      expect(value.trim(), key).not.toBe("");
      expect(checkTelegramHtml(value), key).toBeNull();
    }
    for (const key of ["linked.title", "updates.delivered.body", "status.notFound", "help"]) {
      expect(km[key], key).toMatch(/[ក-៿]/);
    }
  });

  it("fill() replaces known placeholders and leaves unknown ones", () => {
    expect(fill("Hi {name}, {missing}", { name: "<b>Dara</b>" })).toBe("Hi <b>Dara</b>, {missing}");
  });
});
