"use client";

import { useState, useTransition } from "react";
import { MSymbol } from "@/components/icons";
import { faDateTime } from "@/lib/fa";
import { ORDER_STATUS_FA } from "@/lib/state-machines";
import { trackGuestOrderAction, type GuestTrackResult } from "@/lib/actions/orders";
import { cn } from "@/lib/utils";

/**
 * پیگیری سفارش مهمان (M5/M7) — «شماره سفارش + شماره موبایل»، rate-limited،
 * بدون OTP (پیامک در محدوده نیست). پیام خطا یکسان برای «نیست» و «نادرست».
 */
export function GuestTrackView() {
  const [orderNumber, setOrderNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  type TrackedOrder = Extract<GuestTrackResult, { ok: true }>["order"];
  const [order, setOrder] = useState<TrackedOrder | null>(null);

  const submit = () =>
    startTransition(async () => {
      setError(null);
      const res = await trackGuestOrderAction({ orderNumber, phone });
      if (res.ok) {
        setOrder(res.order);
      } else {
        setOrder(null);
        setError(res.error);
      }
    });

  return (
    <div className="max-w-2xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <h1 className="text-xl font-bold text-primary mb-1">پیگیری سفارش (بدون ورود)</h1>
      <p className="text-xs text-on-surface-variant mb-5 leading-5">
        شماره سفارش روی برگه پرداخت و صفحه نتیجه نمایش داده شده است؛ با شماره موبایل ثبت‌شده، وضعیت سفارش را ببینید.
        پیامک ارسال نمی‌شود و تعداد تلاش‌ها محدود است.
      </p>

      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 mb-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-on-surface-variant">شماره سفارش</span>
            <input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="RSH-ORD-…"
              dir="ltr"
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-left"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-[11px] font-bold text-on-surface-variant">شماره موبایل</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09123456789"
              dir="ltr"
              inputMode="numeric"
              className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm text-left"
            />
          </label>
        </div>
        <button
          onClick={submit}
          disabled={pending || orderNumber.trim().length < 4 || phone.trim().length < 10}
          className="mt-3 rounded-full bg-primary text-on-primary px-6 py-2.5 text-sm font-bold disabled:opacity-60"
        >
          {pending ? "در حال جستجو…" : "پیگیری سفارش"}
        </button>
        {error && (
          <p className="mt-3 rounded-lg bg-error-container/40 text-on-error-container text-xs px-3 py-2">{error}</p>
        )}
      </section>

      {order && (
        <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="font-bold text-primary">سفارش {order.orderNumber}</p>
            <span className="text-xs font-bold rounded-full bg-primary-fixed text-on-primary-fixed px-3 py-1">
              {ORDER_STATUS_FA[order.status] ?? order.status}
            </span>
          </div>
          <div className="space-y-2 mb-4">
            {order.items.map((i, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <img src={i.image} alt={i.title} className="w-12 h-12 rounded-lg object-cover" />
                <div className="min-w-0">
                  <p className="text-sm text-on-surface truncate">{i.title}</p>
                  <p className="text-[11px] text-on-surface-variant">تعداد: {i.quantity}</p>
                </div>
              </div>
            ))}
          </div>
          <ol className="relative border-r-2 border-outline-variant/40 mr-3 space-y-3">
            {order.events.map((e, idx) => (
              <li key={idx} className="mr-6 relative">
                <span className={cn("absolute -right-[9px] top-1 w-4 h-4 rounded-full border-2 border-surface-bright", idx === order.events.length - 1 ? "bg-secondary" : "bg-outline/40")} />
                <p className="text-sm font-semibold text-on-surface">
                  {e.type === "PAYMENT" ? "پرداخت" : e.type === "RETURN" ? "مرجوعی" : "وضعیت"}
                  {e.status ? ` — ${ORDER_STATUS_FA[e.status] ?? e.status}` : ""}
                </p>
                {e.detail && <p className="text-xs text-on-surface-variant mt-0.5 leading-5">{e.detail}</p>}
                <p className="text-[10px] text-outline mt-1">{faDateTime(e.createdAt)} — {e.actor}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
