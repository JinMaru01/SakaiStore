import { SearchX } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui";

export default function AdminNotFound() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-[var(--radius-card)] border border-border bg-surface p-6 text-center">
      <SearchX className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
      <h1 className="mt-3 font-display text-xl font-semibold">Not found</h1>
      <p className="mt-1 text-sm text-muted">It may have been deleted, or the link is wrong.</p>
      <Link href="/admin" className={buttonClasses("secondary", "md", "mt-5")}>
        Back to dashboard
      </Link>
    </div>
  );
}
