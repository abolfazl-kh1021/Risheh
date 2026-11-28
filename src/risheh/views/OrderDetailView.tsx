"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDate, faDateTime, faNum, faPrice } from "@/lib/fa";
import { ORDER_STATUS_FA, PAYMENT_STATUS_FA } from "@/lib/state-machines";
import { cancelPendingOrderAction, confirmDeliveryAction, requestReturnAction, retryOrderPaymentAction } from "@/lib/actions/orders";
import type { OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * جزئیات سفارش (M7) — تایم‌لاین رویدادها، زیرسفارش‌ها، اقدامات خریدار
 * (تلاش مجدد پرداخت، تایید تحویل، درخواست مرجوعی، لغو پیش از پرداخت).
 */
export function OrderDetailView({ order, payParam }: { order: OrderDTO; payParam?: string }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [returnItemId, setReturnItemId] = useState<string | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [returnDetail, setReturnDetail] = useState("");

  const payBanner =
    payParam === "success"
      ? { tone: "ok", text: "پرداخت نمایشی با موفقیت تایید شد — پول واقعی جابه‌جا نشده است." }
      : payParam === "failed"
        ? { tone: "err", text: "پرداخت ناموفق بود یا لغو شد؛ می‌توانید دوباره تلاش کنید (سبد حفظ شده است)." }
        : payParam === "canceled"
          ? { tone: "err", text: "پرداخت لغو شد." }
          : payParam === "already"
            ? { tone: "ok", text: "این پرداخت قبلاً نهایی شده است (ضد تکرار)." }
            : null;

  const retryPay = () =>
    startTransition(async () => {
      const res = await retryOrderPaymentAction(order.orderNumber);
      if (res.ok) {
        window.location.href = res.redirectUrl;
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    });

  const cancelOrder = () =>
    startTransition(async () => {
      const res = await cancelPendingOrderAction(order.orderNumber);
      if (res.ok) toast({ title: "لغو سفارش", description: res.message });
      else toast({ title: "خطا", description: res.error, variant: "destructive" });
      window.location.reload();
    });

  const confirmDelivery = (sellerOrderId: string) =>
    startTransition(async () => {
      const res = await confirmDeliveryAction(sellerOrderId);
      if (res.ok) toast({ title: "تحویل", description: res.message });
      else toast({ title: "خطا", description: res.error, variant: "destructive" });
      window.location.reload();
    });

  const submitReturn = () => {
    if (!returnItemId) return;
    startTransition(async () => {
      const res = await requestReturnAction({ orderItemId: returnItemId, reason: returnReason, detail: returnDetail });
      if (res.ok) {
        toast({ title: "مرجوعی", description: res.message });
        setReturnItemId(null);
        setReturnReason("");
        setReturnDetail("");
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    });
  };

  const canPay = order.status === "PENDING_PAYMENT" || order.status === "PAYMENT_FAILED";

  return (
    <div className="max-w-5xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div>
          <h1 className="text-xl font-bold text-primary">سفارش {order.orderNumber}</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            ثبت‌شده در {faDateTime(order.createdAt)} — {ORDER_STATUS_FA[order.status] ?? order.status}
          </p>
        </div>
        <div className="flex gap-2">
          {canPay && (
            <button
              onClick={retryPay}
              disabled={pending}
              className="rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold disabled:opacity-60"
            >
              {order.status === "PAYMENT_FAILED" ? "تلاش مجدد پرداخت" : "ادامه پرداخت"}
            </button>
          )}
          {order.status === "PENDING_PAYMENT" && (
            <button
              onClick={cancelOrder}
              disabled={pending}
              className="rounded-full border border-outline px-5 py-2.5 text-sm font-bold text-on-surface disabled:opacity-60"
            >
              لغو سفارش
            </button>
          )}
        </div>
      </div>

      {payBanner && (
        <p
          className={cn(
            "mb-4 rounded-xl px-4 py-3 text-sm",
            payBanner.tone === "ok"
              ? "bg-secondary/10 text-secondary border border-secondary/30"
              : "bg-error-container/40 text-on-error-container border border-error/30"
          )}
        >
          {payBanner.text}
        </p>
      )}

      {/* Items grouped by seller sub-order */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 mb-4">
        <h2 className="font-bold text-primary mb-3 flex items-center gap-2">
          <MSymbol name="inventory_2" className="text-secondary" />
          اقلام و زیرسفارش‌ها
        </h2>
        <div className="space-y-4">
          {order.sellerOrders.length === 0 && (
            <p className="text-sm text-on-surface-variant">اقلام سفارش پس از پرداخت موفق به کارگاه‌ها تخصیص می‌یابند.</p>
          )}
          {order.sellerOrders.map((so) => {
            const items = order.items.filter((i) => i.sellerOrderId === so.id);
            return (
              <div key={so.id} className="rounded-xl border border-outline-variant/40 bg-surface-container-low p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <p className="text-sm font-bold text-primary">
                    کارگاه {so.sellerShopTitle ?? so.sellerName}
                  </p>
                  <span className="text-[11px] rounded-full bg-primary-fixed text-on-primary-fixed px-2.5 py-1 font-bold">
                    {ORDER_STATUS_FA[so.status] ?? so.status}
                  </span>
                </div>
                <div className="mt-2 space-y-2">
                  {items.map((i) => (
                    <div key={i.id} className="flex items-center gap-3">
                      <img src={i.image} alt={i.title} className="w-12 h-12 rounded-lg object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface truncate">{i.title}</p>
                        <p className="text-[11px] text-on-surface-variant">
                          {faNum(i.quantity)} × {faPrice(i.unitPrice)} تومان
                        </p>
                      </div>
                      {so.status === "DELIVERED" && (
                        <button
                          onClick={() => setReturnItemId(i.id)}
                          className="text-[11px] rounded-full border border-outline px-3 py-1.5 text-on-surface-variant hover:text-error transition"
                        >
                          درخواست مرجوعی
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between flex-wrap gap-2 text-[11px] text-on-surface-variant">
                  <span>
                    جمع بخش: {faPrice(so.net)} تومان — کارمزد پلتفرم: {faPrice(so.commission)} تومان
                  </span>
                  {so.status === "SHIPPED" && (
                    <button
                      onClick={() => confirmDelivery(so.id)}
                      disabled={pending}
                      className="rounded-full bg-secondary text-on-secondary px-4 py-1.5 font-bold disabled:opacity-60"
                    >
                      تحویل گرفتم
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {returnItemId && (
          <div className="mt-4 rounded-xl border border-secondary/40 bg-secondary/5 p-3">
            <p className="text-sm font-bold text-primary mb-2">دلیل درخواست مرجوعی:</p>
            <input
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="مثال: مغایرت رنگ با تصویر سایت"
              className="w-full rounded-lg border border-outline-variant/40 bg-surface-bright px-3 py-2 text-sm mb-2"
            />
            <textarea
              value={returnDetail}
              onChange={(e) => setReturnDetail(e.target.value)}
              placeholder="توضیح بیشتر (اختیاری)"
              rows={2}
              className="w-full rounded-lg border border-outline-variant/40 bg-surface-bright px-3 py-2 text-sm mb-2 resize-none"
            />
            <div className="flex gap-2">
              <button
                onClick={submitReturn}
                disabled={pending || returnReason.trim().length < 3}
                className="rounded-full bg-primary text-on-primary px-4 py-2 text-xs font-bold disabled:opacity-60"
              >
                ثبت درخواست
              </button>
              <button
                onClick={() => setReturnItemId(null)}
                className="rounded-full border border-outline px-4 py-2 text-xs font-bold"
              >
                انصراف
              </button>
            </div>
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 mb-4">
        <h2 className="font-bold text-primary mb-3 flex items-center gap-2">
          <MSymbol name="timeline" className="text-secondary" />
          رویدادهای پیگیری سفارش
        </h2>
        <ol className="relative border-r-2 border-outline-variant/40 mr-3 space-y-4">
          {order.events.map((e) => (
            <li key={e.id} className="mr-6 relative">
              <span className="absolute -right-[9px] top-1 w-4 h-4 rounded-full bg-secondary border-2 border-surface-bright" />
              <p className="text-sm font-semibold text-on-surface">
                {e.type === "PAYMENT" ? "پرداخت" : e.type === "RETURN" ? "مرجوعی" : "وضعیت"}
                {e.status ? ` — ${ORDER_STATUS_FA[e.status] ?? PAYMENT_STATUS_FA[e.status] ?? e.status}` : ""}
              </p>
              {e.detail && <p className="text-xs text-on-surface-variant mt-0.5 leading-5">{e.detail}</p>}
              <p className="text-[10px] text-outline mt-1">
                {faDateTime(e.createdAt)} — به‌واسطه {e.actor}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {/* Payments + summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-bold text-primary mb-3 flex items-center gap-2">
            <MSymbol name="payments" className="text-secondary" />
            پرداخت‌ها
          </h2>
          {order.payments.length === 0 && <p className="text-sm text-on-surface-variant">تلاشی ثبت نشده است.</p>}
          <div className="space-y-2">
            {order.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-xs rounded-lg bg-surface-container-low px-3 py-2">
                <span>
                  {faPrice(p.amount)} تومان — {PAYMENT_STATUS_FA[p.status] ?? p.status}
                </span>
                <span className="text-outline">{faDate(p.createdAt)}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-bold text-primary mb-3 flex items-center gap-2">
            <MSymbol name="receipt_long" className="text-secondary" />
            صورت‌حساب
          </h2>
          <div className="space-y-1.5 text-sm text-on-surface-variant">
            <div className="flex justify-between"><span>مجموع آثار</span><span>{faPrice(order.subtotal)}</span></div>
            {order.discount > 0 && (
              <div className="flex justify-between text-secondary"><span>تخفیف</span><span>−{faPrice(order.discount)}</span></div>
            )}
            <div className="flex justify-between"><span>ارسال</span><span>{order.shipping === 0 ? "رایگان" : faPrice(order.shipping)}</span></div>
            <div className="border-t border-dashed border-outline-variant/40 pt-2 flex justify-between font-bold text-primary">
              <span>مبلغ کل</span><span>{faPrice(order.total)} تومان</span>
            </div>
          </div>
        </section>
      </div>

      <p className="mt-4 text-[11px] text-outline leading-5">
        رویدادهای وضعیت سفارش در همین تایم‌لاین ثبت می‌شوند؛ یکپارچگی با شرکت‌های حمل و شماره رهگیری زنده در محدوده فعلی نیست.
      </p>
    </div>
  );
}
