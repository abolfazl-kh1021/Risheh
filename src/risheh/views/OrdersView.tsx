"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime, faNum, faPrice } from "@/lib/fa";
import { ORDER_STATUS_FA } from "@/lib/state-machines";
import { cancelPendingOrderAction, retryOrderPaymentAction } from "@/lib/actions/orders";
import type { AppData, OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

const TRACK_STEPS = ["PENDING_PAYMENT", "PAID", "PREPARING", "SHIPPED", "DELIVERED"] as const;

function StatusChip({ status }: { status: string }) {
  const map: Record<string, string> = {
    PAID: "bg-secondary/10 text-secondary border-secondary/40",
    PREPARING: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim",
    SHIPPED: "bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim",
    DELIVERED: "bg-secondary/15 text-secondary border-secondary/50",
    CANCELLED: "bg-error-container text-on-error-container border-error/40",
    EXPIRED: "bg-surface-container text-on-surface-variant border-outline-variant",
    PENDING_PAYMENT: "bg-surface-container text-on-surface-variant border-outline-variant",
    PAYMENT_FAILED: "bg-error-container text-on-error-container border-error/40",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2.5 py-1", map[status] ?? map.PENDING_PAYMENT)}>
      {ORDER_STATUS_FA[status] ?? status}
    </span>
  );
}

/** تاریخچه سفارش خریدار (M7) — کارت‌ها، رهگیر وضعیت و پیوند جزئیات. */
export function OrdersView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const [expanded, setExpanded] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="local_shipping" size={44} className="text-outline" />
          <p className="font-headline-md text-primary font-bold">پیگیری سفارش‌ها نیازمند ورود است</p>
          <button
            onClick={() => navigate("login")}
            className="mt-1 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition"
          >
            ورود | ثبت‌نام
          </button>
          <button
            onClick={() => navigate("track")}
            className="text-xs text-secondary hover:underline"
          >
            سفارش مهمان دارید؟ پیگیری با شماره سفارش و موبایل
          </button>
        </div>
      </div>
    );
  }

  const myOrders = data.myOrders ?? [];

  const retryPay = async (o: OrderDTO) => {
    setBusyId(o.id);
    const res = await retryOrderPaymentAction(o.orderNumber);
    setBusyId(null);
    if (res.ok) {
      window.location.href = res.redirectUrl;
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  const cancelOrder = async (o: OrderDTO) => {
    setBusyId(o.id);
    const res = await cancelPendingOrderAction(o.orderNumber);
    setBusyId(null);
    if (res.ok) {
      toast({ title: "لغو سفارش", description: res.message });
      refresh();
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="font-headline-lg text-primary font-extrabold">سفارش‌های من</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            پیگیری سفارش‌ها و مرور وضعیت مرسولات خریداری‌شده — وضعیت کلی سفارش از زیرسفارش کارگاه‌ها مشتق می‌شود.
          </p>
        </div>
        <button
          onClick={() => navigate("track")}
          className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1"
        >
          <MSymbol name="travel_explore" size={16} />
          پیگیری سفارش مهمان
        </button>
      </div>

      {myOrders.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-2">
          <MSymbol name="inbox" size={40} className="text-outline" />
          <p className="text-sm text-on-surface-variant">هنوز سفارشی ثبت نکرده‌اید.</p>
          <button
            onClick={() => navigate("categories/all")}
            className="bg-primary text-on-primary rounded-xl px-5 py-2.5 text-xs font-bold hover:bg-primary-container transition"
          >
            مشاهده گنجینه آثار
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {myOrders.map((o) => {
            const stepIdx = TRACK_STEPS.indexOf((o.status as (typeof TRACK_STEPS)[number]) ?? "PAID");
            const isOpen = expanded === o.id;
            const canPay = o.status === "PENDING_PAYMENT" || o.status === "PAYMENT_FAILED";
            return (
              <div key={o.id} className="bg-surface-container-lowest rounded-2xl elevation-1 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate(`orders/${o.orderNumber}`)}
                        className="font-mono text-xs font-bold text-primary hover:underline"
                      >
                        {o.orderNumber}
                      </button>
                      <StatusChip status={o.status} />
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span className="text-outline">{faDateTime(o.createdAt)}</span>
                      <span className="font-black text-primary">{faPrice(o.total)} تومان</span>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="flex items-center gap-1 mt-3">
                    {TRACK_STEPS.map((s, i) => {
                      const reached = o.status !== "CANCELLED" && o.status !== "PAYMENT_FAILED" && o.status !== "EXPIRED" && stepIdx >= i && stepIdx >= 0;
                      const isCurrent = reached && stepIdx === i;
                      return (
                        <div key={s} className="flex-1 flex items-center gap-1">
                          <div
                            className={cn(
                              "w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold border-2 transition",
                              reached ? "bg-secondary text-white border-secondary" : "bg-surface-container text-outline border-outline-variant",
                              isCurrent && "ring-2 ring-secondary/30"
                            )}
                          >
                            {reached ? <MSymbol name="check" size={13} /> : faNum(i + 1)}
                          </div>
                          <span className={cn("text-[9px] hidden sm:block whitespace-nowrap", reached ? "text-secondary font-bold" : "text-outline")}>
                            {ORDER_STATUS_FA[s]?.split(" — ")[0]}
                          </span>
                          {i < TRACK_STEPS.length - 1 && (
                            <div className={cn("flex-1 h-0.5 rounded", stepIdx > i ? "bg-secondary" : "bg-outline-variant/40")} />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Items preview */}
                  <div className="flex items-center gap-2 mt-3 flex-wrap">
                    {o.items.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-1.5">
                        <img src={i.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="text-[11px] font-bold text-primary line-clamp-1 max-w-[180px]">{i.title}</p>
                          <p className="text-[10px] text-outline">
                            {faNum(i.quantity)} نسخه × {faPrice(i.unitPrice)} تومان
                          </p>
                        </div>
                      </div>
                    ))}
                    {canPay && (
                      <button
                        onClick={() => retryPay(o)}
                        disabled={busyId === o.id}
                        className="px-4 py-2 rounded-full bg-primary text-on-primary text-xs font-bold disabled:opacity-60"
                      >
                        {o.status === "PAYMENT_FAILED" ? "تلاش مجدد پرداخت" : "ادامه پرداخت"}
                      </button>
                    )}
                    {o.status === "PENDING_PAYMENT" && (
                      <button
                        onClick={() => cancelOrder(o)}
                        disabled={busyId === o.id}
                        className="px-4 py-2 rounded-full border border-outline text-xs font-bold text-on-surface-variant disabled:opacity-60"
                      >
                        لغو سفارش
                      </button>
                    )}
                    <button
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1"
                    >
                      {isOpen ? "بستن جزئیات" : "جزئیات و تایم‌لاین"}
                      <MSymbol name={isOpen ? "expand_less" : "expand_more"} size={16} />
                    </button>
                    <button
                      onClick={() => navigate(`orders/${o.orderNumber}`)}
                      className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1"
                    >
                      صفحه سفارش
                      <MSymbol name="arrow_left_alt" size={16} />
                    </button>
                  </div>
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-outline-variant/40 bg-surface-container-low p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                        <MSymbol name="payments" size={14} className="text-secondary" />
                        پرداخت‌ها
                      </h4>
                      <div className="space-y-2">
                        {o.payments.length === 0 && <p className="text-[11px] text-outline">تلاش پرداختی ثبت نشده است.</p>}
                        {o.payments.map((p) => (
                          <div key={p.id} className="text-[11px] text-on-surface-variant bg-surface-bright rounded-xl p-2.5">
                            <p className="font-bold text-primary mb-1">
                              {faPrice(p.amount)} تومان — {ORDER_STATUS_FA[p.status] ?? p.status}
                            </p>
                            <p>درگاه: {p.provider === "demo" ? "نمایشی (بدون انتقال پول)" : p.provider}</p>
                            {p.refNumber && (
                              <p dir="ltr" className="font-mono">
                                REF: {p.refNumber}
                              </p>
                            )}
                            {p.message && <p className="mt-1 text-outline leading-5">{p.message}</p>}
                          </div>
                        ))}
                      </div>
                      <h4 className="text-xs font-bold text-primary mb-2 mt-3 flex items-center gap-1.5">
                        <MSymbol name="inventory_2" size={14} className="text-secondary" />
                        کارگاه‌های سفارش
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {o.sellerOrders.map((so) => (
                          <span key={so.id} className="text-[10px] rounded-full bg-surface-container px-2.5 py-1 text-on-surface-variant">
                            {so.sellerShopTitle ?? so.sellerName}: {ORDER_STATUS_FA[so.status] ?? so.status}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                        <MSymbol name="timeline" size={14} className="text-secondary" />
                        رویدادهای سفارش
                      </h4>
                      <div className="flex flex-col gap-2">
                        {o.events.length === 0 && <p className="text-[11px] text-outline">رویدادی ثبت نشده است.</p>}
                        {o.events.slice(-6).reverse().map((t) => (
                          <div key={t.id} className="flex items-start gap-2 text-[11px]">
                            <MSymbol name="history" size={14} className="text-outline mt-0.5 shrink-0" />
                            <div>
                              <p className="font-bold text-on-surface">
                                {ORDER_STATUS_FA[t.status ?? ""] ?? (t.type === "PAYMENT" ? "پرداخت" : t.type === "RETURN" ? "مرجوعی" : "رویداد")}
                                <span className="font-normal text-outline"> — {faDateTime(t.createdAt)}</span>
                              </p>
                              {t.detail && <p className="text-outline leading-relaxed">{t.detail}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
