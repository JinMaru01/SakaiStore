import Link from "next/link";
import type { Block, Inline, ListBlock } from "@/lib/marketing/markdown";
import { cn } from "@/lib/utils";

/**
 * Renders parsed Markdown (src/lib/marketing/markdown.ts) as React elements —
 * no dangerouslySetInnerHTML, so file content can never inject markup.
 */

function InlineView({ nodes }: { nodes: Inline[] }) {
  return (
    <>
      {nodes.map((n, i) => {
        switch (n.type) {
          case "text":
            return <span key={i}>{n.text}</span>;
          case "code":
            return (
              <code key={i} className="rounded-md bg-surface-2 px-1.5 py-0.5 font-mono text-[0.85em] text-accent [overflow-wrap:anywhere]">
                {n.text}
              </code>
            );
          case "strong":
            return (
              <strong key={i} className="font-semibold text-fg">
                <InlineView nodes={n.children} />
              </strong>
            );
          case "em":
            return (
              <em key={i}>
                <InlineView nodes={n.children} />
              </em>
            );
          case "link": {
            const external = /^(https?|mailto):/.test(n.href);
            return external ? (
              <a key={i} href={n.href} target="_blank" rel="noopener noreferrer" className="text-primary underline-offset-4 hover:underline break-words">
                <InlineView nodes={n.children} />
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            ) : n.href.startsWith("#") ? (
              <a key={i} href={n.href} className="text-primary underline-offset-4 hover:underline">
                <InlineView nodes={n.children} />
              </a>
            ) : (
              <Link key={i} href={n.href} className="text-primary underline-offset-4 hover:underline">
                <InlineView nodes={n.children} />
              </Link>
            );
          }
        }
      })}
    </>
  );
}

function ListView({ list, nested }: { list: ListBlock; nested?: boolean }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag
      start={list.ordered && list.start !== 1 ? list.start : undefined}
      className={cn("space-y-1.5 pl-5", list.ordered ? "list-decimal" : "list-disc", nested ? "mt-1.5" : "my-3")}
    >
      {list.items.map((item, i) => (
        <li key={i} className={cn("marker:text-muted", item.checked !== null && "list-none -ml-5")}>
          {item.checked !== null && (
            <span
              aria-hidden="true"
              className={cn(
                "mr-2 inline-grid h-4 w-4 translate-y-0.5 place-items-center rounded border text-[10px]",
                item.checked ? "border-success bg-success/20 text-success" : "border-border",
              )}
            >
              {item.checked ? "✓" : ""}
            </span>
          )}
          {item.checked !== null && <span className="sr-only">{item.checked ? "Done: " : "To do: "}</span>}
          <InlineView nodes={item.content} />
          {item.children && <ListView list={item.children} nested />}
        </li>
      ))}
    </Tag>
  );
}

const HEADING_CLASS: Record<number, string> = {
  1: "mt-2 mb-4 font-display text-2xl font-bold sm:text-3xl",
  2: "mt-10 mb-3 border-t border-border pt-6 font-display text-xl font-bold sm:text-2xl",
  3: "mt-6 mb-2 font-display text-lg font-semibold",
  4: "mt-4 mb-1.5 text-base font-semibold",
};

export function MarkdownView({ blocks, className }: { blocks: Block[]; className?: string }) {
  return (
    <div className={cn("min-w-0 text-[15px] leading-relaxed text-fg/90", className)}>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "heading": {
            const H = `h${b.level}` as "h1" | "h2" | "h3" | "h4";
            return (
              <H key={i} id={b.id} className={cn("scroll-mt-20 text-fg", HEADING_CLASS[b.level])}>
                <InlineView nodes={b.content} />
              </H>
            );
          }
          case "paragraph":
            return (
              <p key={i} className="my-3 [overflow-wrap:anywhere]">
                <InlineView nodes={b.content} />
              </p>
            );
          case "list":
            return <ListView key={i} list={b} />;
          case "code":
            return (
              <pre key={i} className="my-3 overflow-x-auto rounded-xl border border-border bg-bg p-3.5 text-[13px] leading-relaxed whitespace-pre-wrap">
                <code>{b.text}</code>
              </pre>
            );
          case "quote":
            return (
              <blockquote key={i} className="my-4 rounded-r-xl border-l-4 border-primary bg-primary/10 px-4 py-3 text-fg">
                {b.content.map((line, j) => (
                  <p key={j} className={j ? "mt-1.5" : undefined}>
                    <InlineView nodes={line} />
                  </p>
                ))}
              </blockquote>
            );
          case "table":
            return (
              <div key={i} className="my-4 overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[480px] border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border bg-surface-2/60 text-left">
                      {b.header.map((cell, j) => (
                        <th key={j} scope="col" className="px-3 py-2 align-top font-semibold">
                          <InlineView nodes={cell} />
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, r) => (
                      <tr key={r} className="border-b border-border/60 last:border-0">
                        {row.map((cell, j) => (
                          <td key={j} className="px-3 py-2 align-top">
                            <InlineView nodes={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case "hr": {
            // h2 headings already draw a rule above themselves.
            const next = blocks[i + 1];
            if (next?.type === "heading" && next.level === 2) return null;
            return <hr key={i} className="my-6 border-border" />;
          }
        }
      })}
    </div>
  );
}
