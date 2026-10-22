/**
 * Skeleton fallback for lazily-loaded views (dynamic imports).
 * Layout mirrors a typical view: hero band + toolbar + card grid —
 * keeps the CLS of the switch minimal without per-view markup.
 */
export function ViewFallback() {
  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg animate-in fade-in duration-200" aria-hidden="true">
      <div className="rounded-2xl bg-surface-container-low p-8 mb-6 space-y-4">
        <div className="h-4 w-32 rounded-full bg-surface-container-high animate-pulse" />
        <div className="h-8 w-2/3 rounded-lg bg-surface-container-high animate-pulse" />
        <div className="h-4 w-1/2 rounded-full bg-surface-container-high/70 animate-pulse" />
      </div>
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 flex-1 rounded-xl bg-surface-container-low animate-pulse" />
        <div className="h-11 w-28 rounded-xl bg-surface-container-low animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-surface-container-lowest elevation-1 overflow-hidden">
            <div className="aspect-[4/3] bg-surface-container-low animate-pulse" />
            <div className="p-3 space-y-2">
              <div className="h-4 w-3/4 rounded-full bg-surface-container-high animate-pulse" />
              <div className="h-4 w-1/2 rounded-full bg-surface-container-high/70 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
