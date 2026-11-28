import type { Metadata } from "next";
import { db } from "@/lib/db";
import { faPrice } from "@/lib/fa";

export const metadata: Metadata = { title: "شرایط ارسال و مرجوعی", alternates: { canonical: "/shipping" } };

export default async function ShippingPage() {
  const methods = await db.shippingMethod.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-lg leading-8" dir="rtl">
      <h1 className="text-2xl font-bold text-primary mb-4">شرایط ارسال و مرجوعی</h1>
      <div className="space-y-3">
        {methods.map((m) => (
          <div key={m.id} className="bg-surface-container-low rounded-2xl p-4 border border-outline-variant/30">
            <p className="font-semibold text-primary">{m.title}</p>
            {m.description && <p className="text-sm text-on-surface-variant mt-1">{m.description}</p>}
            <p className="text-sm mt-2">هزینه: {m.priceToman === 0 ? "رایگان" : `${faPrice(m.priceToman)} تومان`}</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-on-surface-variant mt-6">
        یکپارچگی با شرکت‌های حمل و کد رهگیری زنده در محدوده فعلی نیست؛ رویدادهای وضعیت سفارش در تایم‌لاین ثبت می‌شوند.
      </p>
    </div>
  );
}
