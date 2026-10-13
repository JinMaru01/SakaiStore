import type { Locale } from "../config";
import type { MessageTree, NamespaceMessages } from "../translate";
import common from "./common";
import game from "./game";
import home from "./home";
import order from "./order";
import pages from "./pages";
import social from "./social";
import track from "./track";

/** All customer-facing namespaces. Admin UI is English-only and not translated. */
export const NAMESPACES = { common, home, game, order, track, social, pages } satisfies Record<
  string,
  NamespaceMessages
>;

export type Namespace = keyof typeof NAMESPACES;

/** Merge every namespace for one locale: { common: {...}, home: {...}, ... }. */
export function getMessages(locale: Locale): MessageTree {
  const out: MessageTree = {};
  for (const [ns, m] of Object.entries(NAMESPACES)) out[ns] = m[locale];
  return out;
}
