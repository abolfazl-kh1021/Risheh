"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime, faNum, faPrice, ORDER_STATUS_FA } from "@/lib/fa";
import { updateOrderStatusAction } from "@/lib/actions/orders";
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
    PENDING_PAYMENT: "bg-surface-container text-on-surface-variant border-outline-variant",
    PAYMENT_FAILED: "bg-error-container text-on-error-container border-error/40",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2.5 py-1", map[status] ?? map.PENDING_PAYMENT)}>
      {ORDER_STATUS_FA[status] ?? status}
    </span>
  );
}

export function OrdersView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const isArtisan = user?.role === "ARTISAN" || user?.role === "ADMIN";
  const [tab, setTab] = useState<"mine" | "shop">(user?.role === "ARTISAN" ? "shop" : "mine");
  const [expanded, setExpanded] = useState<string | null>(null);

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
        </div>
      </div>
    );
  }

  const myOrders = data.myOrders ?? [];
  const shopOrders = data.artisanOrders ?? [];

  const advance = async (order: OrderDTO, status: "PREPARING" | "SHIPPED" | "DELIVERED" | "CANCELLED") => {
    const res = await updateOrderStatusAction({ orderId: order.id, status });
    if (res.ok) {
      toast({ title: "وضعیت سفارش", description: res.message });
      refresh();
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  const sellerItems = (o: OrderDTO) => (user.role === "ADMIN" ? o.items : o.items.filter((i) => i.sellerId === user.id));

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="font-headline-lg text-primary font-extrabold">سفارش‌ها و ارسال</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            {tab === "shop"
              ? "مرسولات جاری نگارخانه — سفارش‌های نیازمند بسته‌بندی امن و تحویل به ناوگان تشریفات ریشه"
              : "پیگیری سفارش‌ها و مرور وضعیت مرسولات خریداری‌شده"}
          </p>
        </div>
        {isArtisan && (
          <div className="flex gap-2 bg-surface-container rounded-full p-1">
            <button
              onClick={() => setTab("shop")}
              className={cn("px-4 py-2 rounded-full text-xs font-bold transition", tab === "shop" ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant")}
            >
              مرسولات جاری کارگاه
            </button>
            <button
              onClick={() => setTab("mine")}
              className={cn("px-4 py-2 rounded-full text-xs font-bold transition", tab === "mine" ? "bg-primary-container text-on-primary shadow-sm" : "text-on-surface-variant")}
            >
              سفارش‌های من
            </button>
          </div>
        )}
      </div>

      {(tab === "shop" ? shopOrders : myOrders).length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-2">
          <MSymbol name="inbox" size={40} className="text-outline" />
          <p className="text-sm text-on-surface-variant">
            {tab === "shop" ? "سفارشی برای کارگاه شما ثبت نشده است." : "هنوز سفارشی ثبت نکرده‌اید."}
          </p>
          <button
            onClick={() => navigate("categories/all")}
            className="bg-primary text-on-primary rounded-xl px-5 py-2.5 text-xs font-bold hover:bg-primary-container transition"
          >
            مشاهده گنجینه آثار
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {(tab === "shop" ? shopOrders : myOrders).map((o) => {
            const items = tab === "shop" ? sellerItems(o) : o.items;
            const stepIdx = TRACK_STEPS.indexOf((o.status as (typeof TRACK_STEPS)[number]) ?? "PAID");
            const isOpen = expanded === o.id;
            return (
              <div key={o.id} className="bg-surface-container-lowest rounded-2xl elevation-1 overflow-hidden">
                <div className="p-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-primary">{o.orderNumber}</span>
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
                      const reached = o.status !== "CANCELLED" && o.status !== "PAYMENT_FAILED" && stepIdx >= i && stepIdx >= 0;
                      const isCurrent = reached && (stepIdx === i || (stepIdx === -1 && i === 0));
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
                    {items.map((i) => (
                      <div key={i.id} className="flex items-center gap-2 bg-surface-container-low rounded-xl p-1.5">
                        { }
                        <img src={i.image} alt="" className="w-10 h-10 rounded-lg object-cover" />
                        <div>
                          <p className="text-[11px] font-bold text-primary line-clamp-1 max-w-[180px]">{i.title}</p>
                          <p className="text-[10px] text-outline">
                            {faNum(i.quantity)} نسخه × {faPrice(i.unitPrice)} تومان
                          </p>
                        </div>
                      </div>
                    ))}
                    <button
                      onClick={() => setExpanded(isOpen ? null : o.id)}
                      className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1"
                    >
                      {isOpen ? "بستن جزئیات" : "جزئیات و رهگیری"}
                      <MSymbol name={isOpen ? "expand_less" : "expand_more"} size={16} />
                    </button>
                  </div>

                  {/* Seller actions */}
                  {tab === "shop" && (
                    <div className="flex items-center gap-2 mt-3 flex-wrap">
                      {o.status === "PAID" && (
                        <button
                          onClick={() => advance(o, "PREPARING")}
                          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition flex items-center gap-1.5"
                        >
                          <MSymbol name="package_2" size={15} />
                          شروع آماده‌سازی و بسته‌بندی امن
                        </button>
                      )}
                      {o.status === "PREPARING" && (
                        <button
                          onClick={() => advance(o, "SHIPPED")}
                          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition flex items-center gap-1.5"
                        >
                          <MSymbol name="local_shipping" size={15} />
                          تحویل به ناوگان تشریفات و ثبت ارسال
                        </button>
                      )}
                      {o.status === "SHIPPED" && (
                        <button
                          onClick={() => advance(o, "DELIVERED")}
                          className="px-4 py-2 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition flex items-center gap-1.5"
                        >
                          <MSymbol name="task_alt" size={15} />
                          تایید تحویل به خریدار
                        </button>
                      )}
                      {(o.status === "PAID" || o.status === "PREPARING") && (
                        <button
                          onClick={() => advance(o, "CANCELLED")}
                          className="px-4 py-2 rounded-lg bg-error-container/50 text-on-error-container text-xs font-bold hover:bg-error-container transition"
                        >
                          لغو سفارش
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Expanded details */}
                {isOpen && (
                  <div className="border-t border-outline-variant/40 bg-surface-container-low p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                        <MSymbol name="pin_drop" size={14} className="text-secondary" />
                        نشانی تحویل
                      </h4>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">
                        {o.buyerName} — {o.buyerPhone}
                        <br />
                        {o.city}، {o.address}
                        {o.postalCode && (
                          <>
                            <br />
                            کد پستی: <span dir="ltr">{o.postalCode}</span>
                          </>
                        )}
                        {o.note && (
                          <>
                            <br />
                            یادداشت: {o.note}
                          </>
                        )}
                      </p>
                      {o.payments[0] && (
                        <div className="mt-2 text-[11px] text-on-surface-variant bg-surface-bright rounded-xl p-2.5">
                          <p className="font-bold text-primary mb-1">اطلاعات پرداخت</p>
                          <p>درگاه: {o.payments[0].gateway === "DEMO" ? "نمایشی (بدون انتقال پول)" : o.payments[0].gateway}</p>
                          {o.payments[0].refNumber && (
                            <p dir="ltr" className="font-mono">
                              REF: {o.payments[0].refNumber}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-primary mb-2 flex items-center gap-1.5">
                        <MSymbol name="timeline" size={14} className="text-secondary" />
                        رویدادهای مرسوله
                      </h4>
                      <div className="flex flex-col gap-2">
                        {o.tracking.length === 0 && <p className="text-[11px] text-outline">رویدادی ثبت نشده است.</p>}
                        {o.tracking.map((t) => (
                          <div key={t.id} className="flex items-start gap-2 text-[11px]">
                            <MSymbol name="history" size={14} className="text-outline mt-0.5 shrink-0" />
                            <div>
                              <p className="font-bold text-on-surface">
                                {ORDER_STATUS_FA[t.status] ?? t.status}
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
