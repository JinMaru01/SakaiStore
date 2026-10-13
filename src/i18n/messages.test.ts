import { describe, expect, it } from "vitest";
import { NAMESPACES } from "./messages";
import type { MessageTree } from "./translate";

function keys(tree: MessageTree, prefix = ""): string[] {
  return Object.entries(tree).flatMap(([k, v]) =>
    typeof v === "string" ? [`${prefix}${k}`] : keys(v, `${prefix}${k}.`),
  );
}

describe("i18n messages", () => {
  for (const [ns, m] of Object.entries(NAMESPACES)) {
    it(`${ns}: en and km have identical keys`, () => {
      expect(keys(m.km as MessageTree).sort()).toEqual(keys(m.en as MessageTree).sort());
    });
    it(`${ns}: placeholders match between en and km`, () => {
      const en = m.en as MessageTree;
      const km = m.km as MessageTree;
      for (const key of keys(en)) {
        const get = (t: MessageTree) =>
          key.split(".").reduce<unknown>((n, p) => (n as MessageTree)?.[p], t) as string;
        const vars = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
        expect(vars(get(km)), `${ns}.${key}`).toEqual(vars(get(en)));
      }
    });
  }
});
