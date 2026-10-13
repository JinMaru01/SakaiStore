/** Instant feedback while an admin page loads (phones on slow 4G). */
export default function AdminLoading() {
  return (
    <div aria-busy="true" aria-live="polite" className="animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="mb-6 h-8 w-48 rounded-lg bg-surface-2" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="h-24 rounded-[var(--radius-card)] border border-border bg-surface" />
        ))}
      </div>
      <div className="mt-6 h-64 rounded-[var(--radius-card)] border border-border bg-surface" />
    </div>
  );
}
