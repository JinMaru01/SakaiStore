import { Fragment, createElement, type ReactNode } from "react";

/**
 * Render a translated message that contains simple tags, e.g.
 *   "By continuing you agree to our <terms>Terms</terms>."
 * Each tag name maps to a renderer that receives the inner text. Unknown tags
 * are rendered as plain text. Lets translators reorder links freely (Khmer word
 * order differs from English) without splitting messages into fragments.
 */
export function richText(
  message: string,
  renderers: Record<string, (chunk: string) => ReactNode>,
): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /<(\w+)>(.*?)<\/\1>/g;
  let last = 0;
  let i = 0;
  for (let m = re.exec(message); m; m = re.exec(message)) {
    if (m.index > last) out.push(message.slice(last, m.index));
    const render = renderers[m[1]!];
    out.push(createElement(Fragment, { key: `rt${i++}` }, render ? render(m[2]!) : m[2]));
    last = m.index + m[0].length;
  }
  if (last < message.length) out.push(message.slice(last));
  return out;
}

/** Split a long translated body into paragraphs on blank lines. */
export function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}
