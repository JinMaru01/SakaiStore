import { ListTree } from "lucide-react";
import type { Metadata } from "next";
import { PageHeader } from "@/components/admin/page-header";
import { MarkdownView } from "@/components/marketing/studio/markdown-view";
import { Card } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { parseMarkdown, tableOfContents } from "@/lib/marketing/markdown";
import { loadPlaybook, PLAYBOOK_FILE } from "@/lib/marketing/playbook";

export const metadata: Metadata = { title: "Social media playbook" };

/** docs/SOCIAL_MEDIA_PLAYBOOK.md, readable on the owner's phone inside the admin. */
export default async function PlaybookPage() {
  await requireAdmin();
  const source = await loadPlaybook();
  const blocks = source ? parseMarkdown(source) : [];
  // The document's own h1 duplicates the page title.
  const body = blocks[0]?.type === "heading" && blocks[0].level === 1 ? blocks.slice(1) : blocks;
  const toc = tableOfContents(body);

  return (
    <>
      <PageHeader
        title="Social media playbook"
        description="Launch and grow the Facebook Page and TikTok account — setup, content plan, ads and rules."
        back={{ href: "/admin/marketing", label: "Marketing studio" }}
      />
      {!source ? (
        <Card className="p-5 text-sm text-muted">
          The playbook file ({PLAYBOOK_FILE}) is not available on this server. Read it in the project repository, or
          include it in the deployment (see the Deployment section of the playbook).
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
          <nav aria-label="Playbook contents" className="lg:sticky lg:top-8 lg:max-h-[calc(100dvh-4rem)] lg:self-start lg:overflow-y-auto">
            {/* Phones: collapsed so the guide starts on screen; desktop: always-visible sidebar. */}
            <details className="rounded-[var(--radius-card)] border border-border bg-surface p-4 lg:hidden">
              <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-fg">
                <ListTree className="h-4 w-4 text-muted" aria-hidden="true" />
                Contents
              </summary>
              <TocList toc={toc} />
            </details>
            <div className="hidden rounded-[var(--radius-card)] border border-border bg-surface p-4 lg:block">
              <p className="flex items-center gap-2 text-sm font-semibold text-fg">
                <ListTree className="h-4 w-4 text-muted" aria-hidden="true" />
                Contents
              </p>
              <TocList toc={toc} />
            </div>
          </nav>
          <Card className="min-w-0 p-4 sm:p-8">
            <MarkdownView blocks={body} />
          </Card>
        </div>
      )}
    </>
  );
}

function TocList({ toc }: { toc: { id: string; text: string }[] }) {
  return (
    <ol className="mt-3 grid gap-1 text-sm">
      {toc.map((t) => (
        <li key={t.id}>
          <a href={`#${t.id}`} className="block rounded-lg px-2 py-1 text-muted hover:bg-surface-2 hover:text-fg">
            {t.text}
          </a>
        </li>
      ))}
    </ol>
  );
}
