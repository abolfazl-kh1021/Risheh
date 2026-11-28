import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-container px-4" dir="rtl">
      <div className="text-center max-w-md">
        <p className="text-6xl font-extrabold text-primary">۴۰۴</p>
        <h1 className="mt-4 text-xl font-bold text-on-surface">صفحه‌ای که دنبالش بودید پیدا نشد</h1>
        <p className="mt-2 text-sm text-on-surface-variant leading-6">
          شاید اثر حذف شده یا نشانی اشتباه است. از گنجینه ریشه ادامه دهید.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link href="/" className="rounded-full bg-primary text-on-primary px-6 py-3 text-sm font-semibold">
            صفحه اصلی
          </Link>
          <Link href="/products" className="rounded-full border border-outline px-6 py-3 text-sm font-semibold text-on-surface">
            همه آثار
          </Link>
        </div>
      </div>
    </div>
  );
}
