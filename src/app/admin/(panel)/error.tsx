"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui";

/** Error boundary for admin pages: keeps the shell, offers a retry. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[admin] page error", error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto mt-10 max-w-md rounded-[var(--radius-card)] border border-danger/40 bg-surface p-6 text-center">
      <TriangleAlert className="mx-auto h-8 w-8 text-danger" aria-hidden="true" />
      <h1 className="mt-3 font-display text-xl font-semibold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted">
        The page could not be loaded. Check the database connection and try again.
        {error.digest && <span className="mt-2 block font-mono text-xs">Error id: {error.digest}</span>}
      </p>
      <Button className="mt-5" onClick={reset}>
        <RotateCcw className="h-4 w-4" aria-hidden="true" />
        Try again
      </Button>
    </div>
  );
}
