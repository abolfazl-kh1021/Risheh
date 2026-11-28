"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime, faPrice } from "@/lib/fa";
import { PAYOUT_STATUS_FA } from "@/lib/state-machines";
import { requestPayoutAction } from "@/lib/actions/artworks";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

const LEDGER_KIND_FA: Record<string, string> = {
  SALE: "فروش",
  COMMISSION: "کارمزد فروش پلتفرم",
  PAYOUT: "واریز تسویه (شبا)",
  LISTING_FEE_REFUND: "اعتبار کارمزد آگهی",
  ADJUSTMENT: "تسویه حساب/اصلاحیه",
};

const LEDGER_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار تحویل",
  HOLDING: "در دوره نگهداری",
  CLEARED: "قابل تسویه",
};

/** نمای مالی استادکار (M8) — فروش و کارمزد از روی ledger، شبه‌escrow سه‌مرحله‌ای. */
export function FinanceView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const [amount, setAmount] = useState("");
  const [iban, setIban] = useState("");
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<"ledger" | "invoices">("ledger");

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
  const balance = data.balance ?? { pending: 0, holding: 0, cleared: 0, lockedInPayouts: 0, available: 0 };
  const payouts = data.payouts ?? [];
  const invoices = data.invoices ?? [];
  const gross = ledger.filter((l) => l.kind === "SALE").reduce((s, l) => s + l.amount, 0);
  const commission = Math.abs(ledger.filter((l) => l.kind === "COMMISSION").reduce((s, l) => s + l.amount, 0));
  const payoutsTotal = Math.abs(ledger.filter((l) => l.kind === "PAYOUT").reduce((s, l) => s + l.amount, 0));

  const request = async () => {
    setBusy(true);
    const res = await requestPayoutAction({ amount, iban: iban || user.iban || "" });
    setBusy(false);
    if (res.ok) {
      toast({ title: "تسویه (نمایشی)", description: res.message });
      setAmount("");
      refresh();
    } else {
      toast({ title: "درخواست ناموفق", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6">
        <h1 className="font-headline-lg font-bold">امور مالی و تسویه (نمایشی)</h1>
        <p className="text-xs text-on-primary-container mt-1 leading-5">
          مانده در سه وضعیت حسابداری نگه داشته می‌شود: در انتظار تحویل ← در دوره نگهداری پس از تحویل ← قابل تسویه.
          کارمزد فروش از پلن شما اعمال و همه‌ی اعداد از دفتر حسابی سرور (Ledger) خوانده می‌شود — هیچ پول واقعی جابه‌جا نمی‌شود.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
        <StatCard icon="pending" label="در انتظار تحویل" value={faPrice(balance.pending)} unit="تومان" />
        <StatCard icon="hourglass_top" label="در دوره نگهداری" value={faPrice(balance.holding)} unit="تومان" />
        <StatCard icon="savings" label="قابل تسویه" value={faPrice(balance.cleared)} unit="تومان" accent />
        <StatCard icon="lock_clock" label="قفل‌شده در درخواست‌ها" value={faPrice(balance.lockedInPayouts)} unit="تومان" />
        <StatCard icon="account_balance_wallet" label="قابل برداشت اکنون" value={faPrice(balance.available)} unit="تومان" accent />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mt-3">
        <StatCard icon="payments" label="مجموع فروش (ناخالص)" value={faPrice(gross)} unit="تومان" />
        <StatCard icon="percent" label="مجموع کارمزد پلتفرم" value={faPrice(commission)} unit="تومان" />
        <StatCard icon="local_atm" label="مجموع واریزهای تسویه‌شده" value={faPrice(payoutsTotal)} unit="تومان" />
        <StatCard icon="receipt" label="تعداد فاکتورهای من" value={String(invoices.length)} unit="فاکتور" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-space-lg">
        {/* Payout request */}
        <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-1">
            <MSymbol name="currency_exchange" className="text-secondary" />
            درخواست تسویه به شبا (نمایشی)
          </h2>
          <p className="text-[11px] text-outline mb-3">
            فقط از مانده «قابل تسویه» می‌توان درخواست داد؛ واریز واقعی بانکی در این نسخه انجام نمی‌شود.
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant">مبلغ درخواستی (تومان)</span>
              <input
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={String(balance.available || 100000)}
                dir="ltr"
                className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-on-surface-variant">شماره شبا (۲۴ رقم با IR)</span>
              <input
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder={user.iban ?? "IR420170000000123456789001"}
                dir="ltr"
                className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm text-left font-mono text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <button
              onClick={request}
              disabled={busy}
              className="w-full py-2.5 rounded-lg bg-primary text-on-primary text-xs font-bold hover:bg-primary-container transition flex items-center justify-center gap-1.5 disabled:opacity-60"
            >
              <MSymbol name="currency_exchange" size={16} />
              {busy ? "در حال ثبت…" : "ثبت درخواست تسویه"}
            </button>
          </div>

          {payouts.length > 0 && (
            <div className="mt-4 pt-3 border-t border-outline-variant/40">
              <h3 className="text-xs font-bold text-primary mb-2">تاریخچه درخواست‌های تسویه</h3>
              <div className="flex flex-col gap-2">
                {payouts.map((s) => (
                  <div key={s.id} className="flex items-center justify-between bg-surface-container-low rounded-xl p-2.5 text-[11px]">
                    <div>
                      <p className="font-bold text-primary">{faPrice(s.amount)} تومان</p>
                      <p className="text-outline" dir="ltr">{s.iban}</p>
                      {s.reference && <p className="text-outline" dir="ltr">REF: {s.reference}</p>}
                    </div>
                    <div className="text-left">
                      <span className={cn("font-bold", s.status === "PAID" ? "text-secondary" : s.status === "REJECTED" ? "text-error" : "text-on-tertiary-container")}>
                        {PAYOUT_STATUS_FA[s.status] ?? s.status}
                      </span>
                      <p className="text-outline">{faDateTime(s.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Ledger / invoices */}
        <section className="lg:col-span-2 bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2">
              <MSymbol name="receipt_long" className="text-secondary" />
              {tab === "ledger" ? "دفتر حسابی (فروش و کارمزد)" : "فاکتورهای من"}
            </h2>
            <div className="flex gap-1 bg-surface-container rounded-full p-1">
              <button
                onClick={() => setTab("ledger")}
                className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold", tab === "ledger" ? "bg-primary-container text-on-primary" : "text-on-surface-variant")}
              >
                دفتر حسابی
              </button>
              <button
                onClick={() => setTab("invoices")}
                className={cn("px-3 py-1.5 rounded-full text-[11px] font-bold", tab === "invoices" ? "bg-primary-container text-on-primary" : "text-on-surface-variant")}
              >
                فاکتورها
              </button>
            </div>
          </div>

          {tab === "ledger" &&
            (ledger.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-8">
                هنوز تراکنشی ثبت نشده است؛ پس از نخستین فروش، رکوردها اینجا نمایش داده می‌شوند.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="text-outline border-b border-outline-variant/40">
                      <th className="py-2 text-right font-medium">شرح</th>
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
                          <span className={cn("font-bold", l.kind === "SALE" ? "text-secondary" : l.kind === "COMMISSION" ? "text-error" : "text-on-tertiary-container")}>
                            {LEDGER_KIND_FA[l.kind] ?? l.kind}
                          </span>
                        </td>
                        <td className={cn("py-2.5 text-left font-black", l.amount >= 0 ? "text-secondary" : "text-error")} dir="ltr">
                          {faPrice(l.amount)} ت
                        </td>
                        <td className="py-2.5">
                          <span className={cn("font-bold", l.status === "CLEARED" ? "text-secondary" : l.status === "HOLDING" ? "text-on-tertiary-container" : "text-outline")}>
                            {LEDGER_STATUS_FA[l.status] ?? l.status}
                          </span>
                        </td>
                        <td className="py-2.5 text-outline">{faDateTime(l.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === "invoices" &&
            (invoices.length === 0 ? (
              <p className="text-xs text-on-surface-variant text-center py-8">فاکتوری ثبت نشده است.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[560px]">
                  <thead>
                    <tr className="text-outline border-b border-outline-variant/40">
                      <th className="py-2 text-right font-medium">شماره فاکتور</th>
                      <th className="py-2 text-right font-medium">نوع</th>
                      <th className="py-2 text-left font-medium">مبلغ</th>
                      <th className="py-2 text-right font-medium">وضعیت</th>
                      <th className="py-2 text-right font-medium">تاریخ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.map((i) => (
                      <tr key={i.id} className="border-b border-outline-variant/30 last:border-0">
                        <td className="py-2.5 font-mono text-[11px]" dir="ltr">{i.number}</td>
                        <td className="py-2.5">
                          {i.kind === "ORDER" ? "سفارش" : i.kind === "LISTING_FEE" ? "کارمزد ثبت آگهی" : "اشتراک پلن"}
                        </td>
                        <td className="py-2.5 text-left font-black" dir="ltr">{faPrice(i.amount)} ت</td>
                        <td className="py-2.5">
                          <span className={cn("font-bold", i.status === "PAID" ? "text-secondary" : i.status === "PENDING" ? "text-on-tertiary-container" : "text-outline")}>
                            {i.status === "PAID" ? "پرداخت‌شده" : i.status === "PENDING" ? "در انتظار پرداخت" : i.status === "REFUNDED" ? "بازگشت‌شده" : i.status === "CANCELED" ? "لغو" : "ناموفق"}
                          </span>
                        </td>
                        <td className="py-2.5 text-outline">{faDateTime(i.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}

          <div className="mt-3 text-[10px] text-outline bg-surface-container-low rounded-xl p-2.5 leading-5">
            مقادیر این صفحه از دفتر حسابی سرور (Ledger) محاسبه می‌شوند؛ در حالت نمایشی هیچ واریز بانکی واقعی انجام نمی‌شود و
            کارمزد ثبت آگهیِ ردشده به‌صورت اعتبار (LISTING_FEE_REFUND) قابل استفاده مجدد است.
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
