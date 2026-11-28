export default function Loading() {
  return (
    <div className="min-h-[50vh] flex items-center justify-center" dir="rtl">
      <div className="flex flex-col items-center gap-3" role="status" aria-label="در حال بارگذاری">
        <span className="w-10 h-10 rounded-full border-4 border-surface-container-high border-t-primary animate-spin" />
        <span className="text-sm text-on-surface-variant">در حال بارگذاری…</span>
      </div>
    </div>
  );
}
