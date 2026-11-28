"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDate, faNum, faPrice } from "@/lib/fa";
import { buyPlanAction } from "@/lib/actions/plans";
import type { PlanDTO, SubscriptionDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * «پلن من» (S5/§۴.۳) — پلن فعلی، سقف مصرف‌شده، مقایسه پلن‌ها و خرید/ارتقا/تمدید
 * شبیه‌سازی‌شده از طریق همان مرز PaymentProvider.
 */
export function PlansManageView({
  subscription,
  activeCount,
  plans,
  categories,
}: {
  subscription: SubscriptionDTO | null;
  activeCount: number;
  plans: PlanDTO[];
  categories: Array<{ slug: string }>;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  void categories;

  const currentPlanId = subscription?.planId ?? "free";
  const currentPlan = plans.find((p) => p.id === currentPlanId);
  const cap = subscription?.maxActiveListings ?? plans.find((p) => p.id === "free")?.maxActiveListings ?? 3;
  const usagePct = cap === null ? 0 : Math.min(100, Math.round((activeCount / cap) * 100));

  const buy = (planId: string) =>
    startTransition(async () => {
      const res = await buyPlanAction(planId);
      if (res.ok && res.redirectUrl) {
        window.location.href = res.redirectUrl;
      } else if (res.ok) {
        toast({ title: "پلن", description: res.message });
        window.location.reload();
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    });

  return (
    <div className="max-w-6xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <h1 className="text-xl font-bold text-primary mb-1">پلن و اشتراک کارگاه من</h1>
      <p className="text-xs text-on-surface-variant mb-5">
        هر فروشنده همیشه یک پلن موثر دارد؛ انقضای اشتراک به پلن رایگان برمی‌گردد و آگهی‌های مازاد بایگانی (نه حذف) می‌شوند.
      </p>

      {/* Current plan card */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-sm text-on-surface-variant">پلن فعلی:</p>
            <p className="text-lg font-extrabold text-primary">{subscription?.planTitle ?? "رایگان"}</p>
            {subscription && (
              <p className="text-xs text-on-surface-variant mt-1">
                از {faDate(subscription.startsAt)} تا {faDate(subscription.expiresAt)}
                {currentPlan && currentPlan.listingFeeToman === 0 ? " — ثبت آگهی بدون کارمزد" : ` — کارمزد هر آگهی ${faPrice(currentPlan?.listingFeeToman ?? 30000)} تومان`}
              </p>
            )}
          </div>
          <div className="text-center">
            <p className="text-2xl font-black text-primary">
              {faNum(activeCount)}<span className="text-sm font-medium text-on-surface-variant"> / {cap === null ? "نامحدود" : faNum(cap)}</span>
            </p>
            <p className="text-[11px] text-on-surface-variant">آگهی فعال (منتشرشده + در انتظار بازبینی)</p>
          </div>
        </div>
        {cap !== null && (
          <div className="mt-3 h-2 rounded-full bg-surface-container overflow-hidden">
            <div
              className={cn("h-full rounded-full", usagePct >= 100 ? "bg-error" : "bg-secondary")}
              style={{ width: `${usagePct}%` }}
            />
          </div>
        )}
        {cap !== null && usagePct >= 100 && (
          <p className="mt-2 text-xs text-error font-bold">
            سقف آگهی پلن شما پر است — برای ادامه، پلن خود را ارتقا دهید یا آگهی‌های فعلی را بایگانی کنید.
          </p>
        )}
      </section>

      {/* Plans comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {plans.map((p) => {
          const isCurrent = p.id === currentPlanId;
          const isUpgrade = p.priceToman > (currentPlan?.priceToman ?? 0);
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl border p-4 flex flex-col gap-3 bg-surface-container-lowest",
                p.highlight ? "border-secondary shadow-md" : "border-outline-variant/40",
                isCurrent && "ring-2 ring-primary/40"
              )}
            >
              <div>
                <div className="flex items-center justify-between">
                  <p className="font-bold text-primary">{p.title}</p>
                  {isCurrent && (
                    <span className="text-[10px] rounded-full bg-primary text-on-primary px-2 py-0.5 font-bold">پلن فعلی</span>
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
              {!isCurrent && (
                <button
                  onClick={() => buy(p.id)}
                  disabled={pending || p.id === "free"}
                  className={cn(
                    "rounded-full px-4 py-2.5 text-xs font-bold transition",
                    p.id === "free"
                      ? "bg-surface-container text-on-surface-variant cursor-default"
                      : p.highlight
                        ? "bg-secondary text-on-secondary hover:brightness-110"
                        : "bg-primary text-on-primary hover:bg-primary-container"
                  )}
                >
                  {p.id === "free"
                    ? "پلن پایه"
                    : p.periodDays === 0
                      ? "خرید پلن"
                      : isUpgrade
                        ? "ارتقا / خرید پلن"
                        : "تمدید / تغییر پلن"}
                </button>
              )}
              {isCurrent && p.id !== "free" && (
                <button
                  onClick={() => buy(p.id)}
                  disabled={pending}
                  className="rounded-full border border-secondary text-secondary px-4 py-2.5 text-xs font-bold disabled:opacity-60"
                >
                  تمدید همین پلن
                </button>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] text-outline leading-5">
        پرداخت پلن‌ها از طریق درگاه نمایشی انجام می‌شود (شبیه‌سازی — پول واقعی جابه‌جا نمی‌شود). سیاست ارتقا: پلن جدید از زمان پرداخت فعال می‌شود و بقیه پلن قبلی لغو می‌گردد (بدون محاسبه روز‌شمار؛ DECISIONS.md D-PLAN-PRORATE).
      </p>
    </div>
  );
}
