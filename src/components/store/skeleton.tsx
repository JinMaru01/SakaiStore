import { cn } from "@/lib/utils";

/** Shimmer placeholder block for loading states. */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-surface-2", className)} />;
}

/** Screen-reader text for loading.tsx skeletons. */
export function LoadingLabel({ label }: { label: string }) {
  return (
    <p role="status" className="sr-only">
      {label}
    </p>
  );
}
