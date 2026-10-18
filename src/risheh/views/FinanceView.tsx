"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime, faPrice, SETTLEMENT_STATUS_FA } from "@/lib/fa";
import { requestSettlementAction } from "@/lib/actions/artworks";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

export function FinanceView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [busy, setBusy] = useState(false);

  if (!user || (user.role !== "ARTISAN" && user.role !== "ADMIN")) {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="account_balance_wallet" size={44} className="text-outline" />
          <p className="font-headline-md text-primary font-bold">امور مالی ویژه استادکاران است</p>
          <p className="text-sm text-on-surface-variant">
            {user ? "دفتر مالی تنها برای حساب‌های استادکار فعال است." : "برای مشاهده دفتر مالی ابتدا وارد حساب شوید."}
          </p>
          <button
            onClick={() => navigate(user ? "dashboard" : "login")}
            className="mt-1 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition"
          >
            {user ? "بازگشت به داشبورد" : "ورود | ثبت‌نام"}
          </button>
        </div>
      </div>
    );
  }

  const ledger = data.ledger ?? [];
  const settlements = data.settlements ?? [];
  const gross = ledger.filter((l) => l.kind === "SALE").reduce((s, l) => s + l.amount, 0);
  const cleared = ledger.filter((l) => l.status === "CLEARED").reduce((s, l) => s + l.amount, 0);
  const payouts = Math.abs(ledger.filter((l) => l.kind === "PAYOUT").reduce((s, l) => s + l.amount, 0));
  const pendingSettle = settlements
    .filter((s) => s.status === "PENDING" || s.status === "APPROVED")
    .reduce((s, l) => s + l.amount, 0);
  const available = Math.max(0, cleared - pendingSettle);

  const request = async () => {
    setBusy(true);
    const res = await requestSettlementAction({ amount, iban });
    setBusy(false);
    if (res.ok) {
      toast({ title: "تسویه", description: res.message });
      setAmount("");
      refresh();
    } else {
      toast({ title: "درخواست ناموفق", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6">
        <h1 className="font-headline-lg font-bold">امور مالی و تسویه</h1>
        <p className="text-xs text-on-primary-container mt-1">
          دفتر ریز تراکنش‌ها و واریزی‌های شبا — تسویه منظم پس از تایید دریافت اثر توسط خریدار
          <span className="text-tertiary-fixed-dim"> ✦ </span>
          کارمزد تضمین اصالت و بیمه: ۱۰٪
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <StatCard icon="payments" label="مجموع فروش ناخالص" value={`${faPrice(gross)}`} unit="تومان" />
        <StatCard icon="account_balance_wallet" label="موجودی قابل تسویه" value={`${faPrice(available)}`} unit="تومان" accent />
        <StatCard icon="local_atm" label="مجموع واریزهای تسویه‌شده" value={`${faPrice(payouts)}`} unit="تومان" />
        <StatCard icon="hourglass_top" label="تسویه در صف بررسی" value={`${faPrice(pendingSettle)}`} unit="تومان" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-space-lg">
        {/* Settlement request */}
        <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-1">
            <MSymbol name="currency_exchange" className="text-secondary" />
            درخواست واریز فوری به شبا
          </h2>
          <p className="text-[11px] text-outline mb-3">
            مبلغ از موجودی قابل تسویه کسر و پس از تایید مدیریت پرداخت می‌شود. (در حالت نمایشی، واریز واقعی
            بانکی انجام نمی‌شود.)
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant">مبلغ درخواستی (تومان)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(available || 100000)}
                dir="ltr"
                className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant">شماره شبا (۲۴ رقم با IR)</span>
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="IR420170000000123456789001"
                dir="ltr"
                className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm text-left font-mono text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <div className="bg-surface-container-low rounded-xl p-2.5 text-[11px] text-on-surface-variant flex items-center gap-2">
              <MSymbol name="account_balance" size={16} className="text-secondary shrink-0" />
              شماره شبای تاییدشده کارگاه — بانک ملی ایران به‌نام {user.name}
            </div>
            <button
              onClick={request}
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <MSymbol name="currency_exchange" size={16} />
              {busy ? "در حال ثبت…" : "ثبت درخواست تسویه"}
            </button>
          </div>

          {settlements.length > 0 && (
            <div className="mt-4 pt-3 border-t border-outline-variant/40">
              <h3 className="text-xs font-bold text-primary mb-2">تاریخچه درخواست‌های تسویه</h3>
              <div className="flex flex-col gap-2">
                {settlements.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-surface-container-low rounded-xl p-2.5 text-[11px]">
                    <div>
                      <p className="font-bold text-primary">{faPrice(s.amount)} تومان</p>
                      <p className="text-outline" dir="ltr">
                        {s.iban}
                      </p>
                    </div>
                    <div className="text-left">
                      <span
                        className={cn(
                          "font-bold",
                          s.status === "PAID" ? "text-secondary" : s.status === "REJECTED" ? "text-error" : "text-on-tertiary-container"
                        )}
                      >
                        {SETTLEMENT_STATUS_FA[s.status] ?? s.status}
                      </span>
                      <p className="text-outline">{faDateTime(s.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Ledger */}
        <section className="lg:col-span-2 bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-3">
            <MSymbol name="receipt_long" className="text-secondary" />
            دفتر ریز تراکنش‌ها
          </h2>
          {ledger.length === 0 ? (
            <p className="text-xs text-on-surface-variant text-center py-8">
              هنوز تراکنشی ثبت نشده است؛ پس از نخستین فروش، رکوردها اینجا نمایش داده می‌شوند.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs min-w-[640px]">
                <thead>
                  <tr className="text-outline border-b border-outline-variant/40">
                    <th className="py-2 text-right font-medium">مربوط به</th>
                    <th className="py-2 text-right font-medium">نوع</th>
                    <th className="py-2 text-left font-medium">مبلغ</th>
                    <th className="py-2 text-right font-medium">وضعیت</th>
                    <th className="py-2 text-right font-medium">تاریخ</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((l) => (
                    <tr key={l.id} className="border-b border-outline-variant/30 last:border-0">
                      <td className="py-2.5 text-on-surface-variant">{l.detail ?? "—"}</td>
                      <td className="py-2.5">
                        <span
                          className={cn(
                            "font-bold",
                            l.kind === "SALE" ? "text-secondary" : l.kind === "COMMISSION" ? "text-error" : "text-on-tertiary-container"
                          )}
                        >
                          {l.kind === "SALE" ? "فروش" : l.kind === "COMMISSION" ? "کارمزد ریشه (۱۰٪)" : l.kind === "PAYOUT" ? "واریز شبا" : "اشتراک"}
                        </span>
                      </td>
                      <td className={cn("py-2.5 text-left font-black", l.amount >= 0 ? "text-secondary" : "text-error")} dir="ltr">
                        {faPrice(l.amount)} ت
                      </td>
                      <td className="py-2.5">
                        <span className={cn("font-bold", l.status === "CLEARED" ? "text-secondary" : "text-on-tertiary-container")}>
                          {l.status === "CLEARED" ? "تسویه‌شده" : "در انتظار"}
                        </span>
                      </td>
                      <td className="py-2.5 text-outline">{faDateTime(l.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 text-[10px] text-outline bg-surface-container-low rounded-xl p-2.5">
            مقادیر این صفحه از دفتر حسابی سرور (Ledger) محاسبه می‌شوند؛ در حالت نمایشی، هیچ واریز بانکی واقعی
            انجام نمی‌شود و مبلغ‌ها نمونه/دمو هستند.
          </div>
        </section>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, unit, accent }: { icon: string; label: string; value: string; unit: string; accent?: boolean }) {
  return (
    <div className={cn("bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1", accent && "border border-secondary/40 bg-secondary/5")}>
      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <MSymbol name={icon} size={16} className={accent ? "text-secondary" : "text-outline"} />
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-headline-sm font-black text-primary">{value}</span>
        <span className="text-[10px] text-outline">{unit}</span>
      </span>
    </div>
  );
}
