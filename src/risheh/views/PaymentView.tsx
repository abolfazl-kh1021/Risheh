"use client";

import { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDate, faPrice, ORDER_STATUS_FA } from "@/lib/fa";
import { verifyDemoPaymentAction } from "@/lib/actions/orders";
import type { AppData, OrderDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type Pending = {
  orderNumber: string;
  authority: string;
  amount: number;
  subtotal?: number;
  discount?: number;
  shipping?: number;
  done?: boolean;
} | null;

/**
 * DEMO PAYMENT GATEWAY — clearly labeled simulation.
 * No real bank gateway is configured. The result is produced ONLY by the
 * server-side demo adapter after verifying the server-issued authority.
 */
export function PaymentView({
  data,
  navigate,
  pending,
  result,
  refresh,
  param,
  onVerified,
}: {
  data: AppData;
  navigate: (to: string) => void;
  pending: Pending;
  result: {
    orderNumber: string;
    status: string;
    refNumber?: string;
    message: string;
    amount: number;
  } | null;
  refresh: () => void;
  param?: string;
  onVerified?: (r: {
    orderNumber: string;
    status: string;
    refNumber?: string;
    message: string;
    amount: number;
  }) => void;
}) {
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [consumed, setConsumed] = useState(false);
  const pendingDone = pending?.done ?? consumed;

  // Result mode: #/payment/<orderNumber>
  const resultOrder: OrderDTO | undefined = param
    ? data.myOrders?.find((o) => o.orderNumber === param)
    : undefined;

  // For signed-in buyers the order lives in data.myOrders; guests render the
  // server-verified outcome held in memory. Refresh only when an order record
  // is actually expected to land.
  useEffect(() => {
    if (param && !resultOrder && !result && data.user) {
      const t = setTimeout(() => refresh(), 800);
      return () => clearTimeout(t);
    }
  }, [param, resultOrder, result, data.user, refresh]);

  // ---------- Result mode ----------
  if (param && !resultOrder && !result) {
    return (
      <div className="max-w-xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="hourglass_top" size={40} className="text-secondary" />
          <p className="text-sm text-on-surface-variant">در حال دریافت نتیجه سفارش از سامانه…</p>
        </div>
      </div>
    );
  }

  if (param && (resultOrder || result)) {
    const payment = resultOrder?.payments[0];
    const statusStr =
      resultOrder?.status ??
      (result!.status === "SUCCESS"
        ? "PAID"
        : result!.status === "FAILED"
          ? "PAYMENT_FAILED"
          : "CANCELLED");
    const success = statusStr === "PAID" || payment?.status === "SUCCESS";
    const cancelled = statusStr === "CANCELLED";
    const failed = statusStr === "PAYMENT_FAILED" || payment?.status === "FAILED";

    return (
      <div className="max-w-3xl mx-auto px-gutter py-space-lg pb-space-xl">
        <div
          className={cn(
            "rounded-3xl elevation-1 overflow-hidden border",
            success ? "bg-secondary/5 border-secondary/30" : "bg-error-container/30 border-error/30"
          )}
        >
          <div className="p-8 text-center flex flex-col items-center gap-3">
            <div
              className={cn(
                "w-20 h-20 rounded-full flex items-center justify-center",
                success ? "bg-secondary/15 text-secondary" : "bg-error/15 text-error"
              )}
            >
              <MSymbol name={success ? "task_alt" : cancelled ? "block" : "error"} size={40} />
            </div>
            <h1 className="font-headline-lg text-primary font-extrabold">
              {success
                ? "پرداخت با موفقیت انجام شد؛ اثر دست‌ساز شما در مسیر آماده‌سازی"
                : cancelled
                  ? "پرداخت لغو شد"
                  : "پرداخت ناموفق بود"}
            </h1>
            {success && (
              <p className="text-sm text-on-surface-variant leading-relaxed max-w-md">
                مشخصات سفارش و پیشرفت آماده‌سازی در داشبورد شما قابل پیگیری است. شناسنامه اصالت اثر همراه مرسول
                تحویل داده می‌شود.
              </p>
            )}
            {payment?.message && (
              <p className="text-[11px] bg-tertiary-fixed/50 text-on-tertiary-fixed-variant rounded-lg px-3 py-1.5">
                {payment.message}
              </p>
            )}

            <div className="w-full bg-surface-bright rounded-2xl border border-outline-variant/40 p-4 mt-2 text-sm flex flex-col gap-2">
              <ResRow label="شماره سفارش:" value={resultOrder?.orderNumber ?? result!.orderNumber} mono />
              {resultOrder && resultOrder.subtotal > 0 && (
                <ResRow label="مجموع بهای آثار:" value={`${faPrice(resultOrder.subtotal)} تومان`} />
              )}
              {resultOrder && resultOrder.discount > 0 && (
                <ResRow label="تخفیف:" value={`${faPrice(resultOrder.discount)} تومان`} />
              )}
              {resultOrder && resultOrder.shipping > 0 && (
                <ResRow label="هزینه ارسال:" value={`${faPrice(resultOrder.shipping)} تومان`} />
              )}
              <ResRow label="مبلغ:" value={`${faPrice(resultOrder?.total ?? result!.amount)} تومان`} />
              {(payment?.refNumber || result?.refNumber) && (
                <ResRow label="شماره پیگیری:" value={payment?.refNumber ?? result!.refNumber!} mono />
              )}
              <ResRow
                label="وضعیت سفارش:"
                value={ORDER_STATUS_FA[statusStr] ?? statusStr}
              />
              <ResRow label="تاریخ:" value={faDate(resultOrder?.createdAt ?? new Date().toISOString())} />
              {resultOrder ? (
                <div className="border-t border-dashed border-outline-variant/40 pt-2 mt-1">
                  {resultOrder.items.map((i) => (
                    <div key={i.id} className="flex items-center justify-between py-1">
                      <span className="text-xs text-on-surface-variant line-clamp-1">{i.title}</span>
                      <span className="text-xs font-bold text-primary shrink-0">
                        {faPrice(i.unitPrice * i.quantity)} تومان
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[11px] text-outline border-t border-dashed border-outline-variant/40 pt-2 mt-1">
                  {result!.message} برای مشاهده ریز اقلام و پیگیری کامل، سفارش‌ها را باز کنید.
                </p>
              )}
            </div>

            <div className="flex gap-2 w-full mt-3 flex-wrap">
              <button
                onClick={() => navigate("orders")}
                className="flex-1 min-w-[140px] py-3 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-primary-container transition"
              >
                پیگیری سفارش‌ها
              </button>
              <button
                onClick={() => navigate("dashboard")}
                className="flex-1 min-w-[140px] py-3 rounded-xl bg-surface-container-high text-primary text-sm font-bold hover:bg-surface-container-highest transition"
              >
                داشبورد من
              </button>
              {!success && !cancelled && (
                <button
                  onClick={() => navigate("cart")}
                  className="flex-1 min-w-[140px] py-3 rounded-xl bg-tertiary-fixed-dim text-tertiary-container text-sm font-bold hover:brightness-105 transition"
                >
                  تلاش مجدد
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="ornament-line mt-6">
          <span className="text-xs text-outline">ریشه؛ پلی میان هنر اصیل ایرانی و زندگی مدرن</span>
        </div>
      </div>
    );
  }

  // ---------- Gateway mode ----------
  if (!pending || pendingDone) return null;

  const pay = async (outcome: "SUCCESS" | "FAILED" | "CANCELLED") => {
    setBusy(true);
    try {
      const res = await verifyDemoPaymentAction({ authority: pending.authority, outcome });
      setBusy(false);
      if (res.ok) {
        refresh();
        // Hand the server-verified outcome to the app shell, mark the gateway
        // session consumed, then navigate to the result view.
        onVerified?.({
          orderNumber: res.orderNumber,
          status: res.status,
          refNumber: res.refNumber,
          message: res.message,
          amount: pending?.amount ?? 0,
        });
        setConsumed(true);
        navigate(`payment/${res.orderNumber}`);
        toast({ title: "پرداخت", description: res.message });
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    } catch (err) {
      setBusy(false);
      console.error("pay() failed", err);
      toast({ title: "خطای غیرمنتظره", description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="max-w-xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="rounded-3xl overflow-hidden elevation-2 bg-surface-container-lowest border border-outline-variant/40">
        <div className="bg-primary-container text-surface-bright px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MSymbol name="account_balance" className="text-tertiary-fixed-dim" />
            <span className="font-bold text-sm">درگاه پرداخت نمایشی ریشه</span>
          </div>
          <span className="text-[10px] bg-tertiary-fixed text-tertiary-container font-bold rounded-full px-2.5 py-1">
            شبیه‌سازی — پول واقعی جابه‌جا نمی‌شود
          </span>
        </div>
        <div className="p-6 flex flex-col gap-4">
          <div className="bg-error-container/40 text-on-error-container rounded-xl p-3 text-[11px] leading-relaxed flex items-start gap-2">
            <MSymbol name="info" size={16} className="shrink-0 mt-0.5" />
            این صفحه یک شبیه‌ساز آموزشیِ درگاه بانکی است. هیچ اتصال بانکی واقعی وجود ندارد و هیچ مبلغی
            کسر یا واریز نمی‌شود. پس از تایید، وضعیت سفارش در سرور به «پرداخت شده (نمایشی)» تغییر می‌کند.
          </div>

          <div className="bg-surface-container-low rounded-2xl p-4 flex flex-col gap-2 text-sm">
            <ResRow label="پذیرنده:" value="نگارخانه صنایع‌دستی ریشه" />
            <ResRow label="شماره سفارش:" value={pending.orderNumber} mono />
            {typeof pending.subtotal === "number" && (
              <ResRow label="مجموع بهای آثار:" value={`${faPrice(pending.subtotal)} تومان`} />
            )}
            {typeof pending.discount === "number" && pending.discount > 0 && (
              <ResRow label="تخفیف کد:" value={`${faPrice(pending.discount)} تومان`} />
            )}
            {typeof pending.shipping === "number" && (
              <ResRow
                label="هزینه ارسال:"
                value={pending.shipping === 0 ? "رایگان" : `${faPrice(pending.shipping)} تومان`}
              />
            )}
            <ResRow label="شناسه تراکنش:" value={pending.authority.slice(0, 18)} mono />
            <div className="border-t border-dashed border-outline-variant/40 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-on-surface-variant">مبلغ قابل پرداخت:</span>
                <span className="text-headline-md font-black text-primary">
                  {faPrice(pending.amount)} <span className="text-xs font-normal">تومان</span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-outline">
            <MSymbol name="credit_card" size={14} />
            درگاه‌های واقعی پس از پیکربندی، به‌جای این نمایشگر ظاهر می‌شوند (به‌پرداخت ملت، سداد، زیبال).
          </div>

          <button
            onClick={() => pay("SUCCESS")}
            disabled={busy}
            className="w-full py-3.5 rounded-xl bg-primary text-on-primary text-sm font-bold hover:bg-secondary transition shadow-md flex items-center justify-center gap-2 disabled:opacity-60"
          >
            <MSymbol name="task_alt" size={18} />
            {busy ? "در حال بررسی…" : "تایید و پرداخت (نمایشی)"}
          </button>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => pay("FAILED")}
              disabled={busy}
              className="py-2.5 rounded-xl bg-error-container/50 text-on-error-container text-xs font-bold hover:bg-error-container transition disabled:opacity-60"
            >
              شبیه‌سازی پرداخت ناموفق
            </button>
            <button
              onClick={() => pay("CANCELLED")}
              disabled={busy}
              className="py-2.5 rounded-xl bg-surface-container-high text-on-surface-variant text-xs font-bold hover:bg-surface-container-highest transition disabled:opacity-60"
            >
              انصراف از پرداخت
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ResRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-on-surface-variant">{label}</span>
      <span className={cn("font-bold text-primary", mono && "font-mono text-xs")}>{value}</span>
    </div>
  );
}
