"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime, faNum, faPrice } from "@/lib/fa";
import { ORDER_STATUS_FA } from "@/lib/state-machines";
import { updateSellerOrderStatusAction } from "@/lib/actions/orders";
import type { SellerOrderRowDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * سفارش‌های کارگاه (M7) — فروشنده فقط زیرسفارش خودش را می‌بیند و جلو می‌برد.
 * گذارها: پرداخت‌شده → آماده‌سازی → ارسال‌شده → تحویل‌شده (ماشین حالت سمت سرور).
 */
export function SellerOrdersView({ data, sellerOrders }: { data: { user: { name: string } | null }; sellerOrders?: SellerOrderRowDTO[] }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const rows = sellerOrders ?? [];

  const advance = (sellerOrderId: string, status: "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED") =>
    startTransition(async () => {
      const res = await updateSellerOrderStatusAction({ sellerOrderId, status });
      if (res.ok) toast({ title: "وضعیت سفارش", description: res.message });
      else toast({ title: "خطا", description: res.error, variant: "destructive" });
      window.location.reload();
    });

  const NEXT_LABEL: Record<string, { to: "PREPARING" | "SHIPPED" | "DELIVERED"; label: string } | null> = {
    PAID: { to: "PREPARING", label: "شروع آماده‌سازی" },
    PREPARING: { to: "SHIPPED", label: "ارسال شد" },
    SHIPPED: { to: "DELIVERED", label: "تحویل داده شد" },
    DELIVERED: null,
    CANCELLED: null,
  };

  const groups: Array<{ status: string; rows: SellerOrderRowDTO[] }> = [
    { status: "PAID", rows: rows.filter((r) => r.status === "PAID") },
    { status: "PREPARING", rows: rows.filter((r) => r.status === "PREPARING") },
    { status: "SHIPPED", rows: rows.filter((r) => r.status === "SHIPPED") },
    { status: "DELIVERED", rows: rows.filter((r) => r.status === "DELIVERED") },
    { status: "CANCELLED", rows: rows.filter((r) => r.status === "CANCELLED") },
  ];

  return (
    <div className="max-w-6xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <div className="mb-5">
        <h1 className="text-xl font-bold text-primary">سفارش‌های کارگاه من</h1>
        <p className="text-xs text-on-surface-variant mt-1 leading-5">
          هر بخش از سفارشِ چندفروشنده به‌صورت مستقل برای کارگاه شما مدیریت می‌شود؛ اطلاعات سایر فروشندگان همان سفارش نمایش داده نمی‌شود.
        </p>
      </div>

      {rows.length === 0 && (
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center">
          <MSymbol name="inbox" size={40} className="text-outline" />
          <p className="mt-2 text-sm text-on-surface-variant">هنوز سفارشی برای کارگاه شما ثبت نشده است.</p>
        </div>
      )}

      <div className="space-y-6">
        {groups.map(
          (g) =>
            g.rows.length > 0 && (
              <section key={g.status}>
                <h2 className="text-sm font-bold text-on-tertiary-container mb-2">
                  {ORDER_STATUS_FA[g.status]} ({faNum(g.rows.length)})
                </h2>
                <div className="space-y-3">
                  {g.rows.map((so) => {
                    const next = NEXT_LABEL[so.status];
                    const open = openId === so.id;
                    return (
                      <div key={so.id} className="bg-surface-container-lowest rounded-2xl elevation-1 p-3.5">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-primary">
                              سفارش {so.orderNumber}
                            </p>
                            <p className="text-[11px] text-on-surface-variant mt-0.5">
                              خریدار: {so.buyerName} — {so.orderCity} | ثبت: {faDateTime(so.orderCreatedAt)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-on-surface">
                              سهم شما: {faPrice(so.net)} تومان (کارمزد {faPrice(so.commission)})
                            </span>
                            {next && (
                              <button
                                onClick={() => advance(so.id, next.to)}
                                disabled={pending}
                                className="rounded-full bg-primary text-on-primary px-4 py-2 text-xs font-bold disabled:opacity-60"
                              >
                                {next.label}
                              </button>
                            )}
                            {so.status === "PAID" && data.user && (
                              <button
                                onClick={() => advance(so.id, "CANCELLED")}
                                disabled={pending}
                                className="rounded-full border border-outline px-3 py-2 text-xs font-bold text-on-surface-variant hover:text-error disabled:opacity-60"
                              >
                                لغو
                              </button>
                            )}
                            <button
                              onClick={() => setOpenId(open ? null : so.id)}
                              aria-expanded={open}
                              className="rounded-full border border-outline px-3 py-2 text-xs font-bold text-on-surface-variant"
                            >
                              {open ? "بستن" : "اقلام و نشانی"}
                            </button>
                          </div>
                        </div>
                        {open && (
                          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-xl bg-surface-container-low p-3">
                              <p className="text-[11px] font-bold text-on-surface-variant mb-2">اقلام بخش شما:</p>
                              <div className="space-y-2">
                                {so.items.map((i) => (
                                  <div key={i.id} className="flex items-center gap-2">
                                    <img src={i.image} alt={i.title} className="w-10 h-10 rounded-lg object-cover" />
                                    <div className="min-w-0">
                                      <p className="text-xs text-on-surface truncate">{i.title}</p>
                                      <p className="text-[10px] text-on-surface-variant">
                                        {faNum(i.quantity)} × {faPrice(i.unitPrice)}
                                      </p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="rounded-xl bg-surface-container-low p-3 text-[11px] leading-6 text-on-surface-variant">
                              <p className="font-bold text-on-surface mb-1">نشانی و تماس خریدار:</p>
                              <p>{so.buyerName}</p>
                              <p dir="ltr" className="text-left">{so.orderPhone}</p>
                              <p>{so.orderCity} — {so.orderAddress}</p>
                              {so.orderNote && <p className="mt-1 text-on-tertiary-container">یادداشت: {so.orderNote}</p>}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            )
        )}
      </div>

      <p className={cn("mt-6 text-[11px] text-outline")} dir="rtl">
        ارسال مرسولات بدون ثبت شماره رهگیری انجام می‌شود (یکپارچگی با شرکت‌های حمل در محدوده نیست)؛ هر گذار وضعیت برای خریدار در تایم‌لاین سفارش ثبت می‌شود.
      </p>
    </div>
  );
}
