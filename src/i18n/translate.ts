/** A message tree: nested objects whose leaves are strings. */
export type MessageTree = { [key: string]: string | MessageTree };

/** Per-namespace message file shape: both locales side by side. */
export type NamespaceMessages = { en: MessageTree; km: MessageTree };

export type TranslateFn = (key: string, vars?: Record<string, string | number>) => string;

function lookup(tree: MessageTree | undefined, key: string): string | undefined {
  let node: string | MessageTree | undefined = tree;
  for (const part of key.split(".")) {
    if (!node || typeof node === "string") return undefined;
    node = node[part];
  }
  return typeof node === "string" ? node : undefined;
}

/**
 * Build a translator. Keys are "namespace.path.to.key" (e.g. "game.selectPackage").
 * Falls back to the fallback tree (English), then to the key itself.
 * Variables use {name} placeholders: t("order.total", { amount: "$1.50" }).
 */
export function createTranslator(messages: MessageTree, fallback?: MessageTree): TranslateFn {
  return (key, vars) => {
    let s = lookup(messages, key) ?? lookup(fallback, key) ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
    }
    return s;
  };
}
