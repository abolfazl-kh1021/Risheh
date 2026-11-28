"use client";

import { MSymbol } from "@/components/icons";
import { faNum, faPrice } from "@/lib/fa";
import type { PlanDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/** مقایسه عمومی پلن‌ها (S5) — صفحه /plans برای بازدیدکنندگان. */
export function PlansPublicView({ plans }: { plans: PlanDTO[] }) {
  return (
    <div className="max-w-6xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <div className="text-center mb-8">
        <p className="text-sm font-bold text-on-tertiary-container flex items-center justify-center gap-2">
          <MSymbol name="workspace_premium" size={20} />
          پلن‌های عضویت استادکاران
        </p>
        <h1 className="text-2xl font-extrabold text-primary mt-2">از رایگان تا طلایی؛ متناسب با مقیاس کارگاه شما</h1>
        <p className="text-sm text-on-surface-variant mt-2 max-w-2xl mx-auto leading-7">
          پیش‌نویس آگهی همیشه رایگان است. کارمزد ثبت آگهی هنگام «ارسال برای بازبینی» اخذ می‌شود و در صورت رد اثر، به‌صورت اعتبار بازگردانده می‌شود.
          کارمزد فروش پلتفرم روی همه پلن‌ها {faNum(plans[0]?.commissionBps ? plans[0].commissionBps / 100 : 10)}٪ است و از پنل مدیریت قابل تنظیم دارد.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-2xl border p-4 flex flex-col gap-3 bg-surface-container-lowest",
              p.highlight ? "border-secondary shadow-md" : "border-outline-variant/40"
            )}
          >
            <div>
              <div className="flex items-center justify-between">
                <p className="font-bold text-primary">{p.title}</p>
                {p.highlight && (
                  <span className="text-[10px] rounded-full bg-secondary text-on-secondary px-2 py-0.5 font-bold">پیشنهاد ریشه</span>
                )}
              </div>
              {p.tag && <p className="text-[11px] text-secondary mt-0.5">{p.tag}</p>}
            </div>
            <p className="text-xl font-black text-primary">
              {p.priceToman === 0 ? "رایگان" : `${faPrice(p.priceToman)} تومان`}
              <span className="text-[11px] font-medium text-on-surface-variant">
                {p.periodDays > 0 ? ` / ${p.periodDays >= 365 ? "سالانه" : `${faNum(Math.round(p.periodDays / 30))} ماهه`}` : ""}
              </span>
            </p>
            <ul className="text-[11px] text-on-surface-variant space-y-1.5 leading-5 flex-1">
              <li className="flex items-center gap-1.5">
                <MSymbol name="inventory" size={14} className="text-secondary shrink-0" />
                سقف آگهی فعال: {p.maxActiveListings === null ? "نامحدود" : faNum(p.maxActiveListings)}
              </li>
              <li className="flex items-center gap-1.5">
                <MSymbol name="sell" size={14} className="text-secondary shrink-0" />
                کارمزد ثبت آگهی: {p.listingFeeToman === 0 ? "بدون کارمزد" : `${faPrice(p.listingFeeToman)} تومان`}
              </li>
              <li className="flex items-center gap-1.5">
                <MSymbol name="percent" size={14} className="text-secondary shrink-0" />
                کارمزد فروش: {faNum(p.commissionBps / 100)}٪
              </li>
              {p.features.map((f, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <MSymbol name="check_circle" size={14} className="text-secondary shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <a
              href="/account/login?mode=register"
              className="block text-center rounded-full px-4 py-2.5 text-xs font-bold bg-primary text-on-primary hover:bg-primary-container transition"
            >
              شروع همکاری
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
