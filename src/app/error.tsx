"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container px-4" dir="rtl">
      <div className="text-center max-w-md">
        <p className="text-6xl font-extrabold text-primary">۵۰۰</p>
        <h1 className="mt-4 text-xl font-bold text-on-surface">خطای غیرمنتظره رخ داد</h1>
        <p className="mt-2 text-sm text-on-surface-variant leading-6">
          مشکلی در سمت ما پیش آمد؛ لطفاً دوباره تلاش کنید.
        </p>
        <button
          onClick={reset}
          className="mt-6 rounded-full bg-primary text-on-primary px-6 py-3 text-sm font-semibold"
        >
          تلاش دوباره
        </button>
      </div>
    </div>
  );
}
