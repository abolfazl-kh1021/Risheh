"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime, faNum, faPrice } from "@/lib/fa";
import {
  decideArtworkVerificationAction,
  decideMemberRequestAction,
  decidePayoutAction,
  decideSettlementAction,
  markMessageHandledAction,
  updateLabStatusAction,
  updateSettingAction,
  assignSubscriptionAction,
  toggleUserSuspensionAction,
} from "@/lib/actions/admin";
import { decideReturnAction as decideReturnStatusAction } from "@/lib/actions/orders";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { AdminDiscountsSection } from "@/risheh/views/AdminDiscountsSection";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

const SECTIONS = [
  { id: "overview", label: "پیشخوان و دید کلی", icon: "dashboard" },
  { id: "artisans", label: "مدیریت استادکاران و اعضا", icon: "group" },
  { id: "plans", label: "پلن‌ها و حق عضویت‌ها", icon: "card_membership" },
  { id: "transactions", label: "تراکنش‌ها و درآمدها", icon: "payments" },
  { id: "discounts", label: "تخفیف‌ها و کدهای هدیه", icon: "sell" },
  { id: "verifications", label: "کارشناسی آثار و صف اصالت", icon: "how_to_reg" },
  { id: "returns", label: "مرجوعی‌ها", icon: "assignment_return" },
  { id: "platform", label: "اشتراک‌ها و تنظیمات", icon: "tune" },
  { id: "support", label: "پشتیبانی و تیکت‌ها", icon: "support_agent" },
  { id: "audit", label: "گزارش رخدادها (Audit Log)", icon: "fact_check" },
] as const;

export function AdminView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>("overview");

  if (!user || user.role !== "ADMIN") {
    return (
      <div className="max-w-7xl mx-auto px-gutter py-space-xl">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-3">
          <MSymbol name="admin_panel_settings" size={44} className="text-outline" />
          <p className="font-headline-md text-primary font-bold">پیشخوان مدیریت تنها برای مدیران سامانه است</p>
          <p className="text-sm text-on-surface-variant">
            دسترسی این بخش در سرور کنترل می‌شود؛ با حساب مدیریتی وارد شوید (نمونه نمایشی: admin@risheh.ir).
          </p>
          <button
            onClick={() => navigate("login")}
            className="mt-1 bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition"
          >
            ورود به حساب مدیریت
          </button>
        </div>
      </div>
    );
  }

  const admin = data.admin!;

  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, title: string) => {
    const res = await fn();
    if (res.ok) {
      toast({ title, description: res.message });
      refresh();
    } else {
      toast({ title: "خطا", description: res.error ?? "عملیات ناموفق بود.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-headline-lg font-bold">سامانه مدیریت و نگارخانه فاخر</h1>
          <p className="text-xs text-on-primary-container mt-1">
            پیشخوان مدیریت اشتراک‌ها، اعضا و عملیات اپراتوری ریشه — دسترسی مدیریتی تاییدشده در سرور
          </p>
        </div>
        <span className="bg-tertiary-fixed-dim text-tertiary-container rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5">
          <MSymbol name="verified_user" size={15} />
          نشست مدیریتی فعال
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mt-4">
        {/* Sidebar */}
        <nav className="lg:col-span-1 flex lg:flex-col gap-1.5 overflow-x-auto scrollbar-none bg-surface-container-lowest rounded-2xl elevation-1 p-2 h-fit">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition text-right",
                section === s.id ? "bg-primary text-on-primary shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high hover:text-primary"
              )}
            >
              <MSymbol name={s.icon} size={18} />
              {s.label}
            </button>
          ))}
        </nav>

        {/* Content */}
        <div className="lg:col-span-3">
          {section === "overview" && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat icon="group" label="اعظای ثبت‌شده" value={faNum(admin.stats.users)} />
                <Stat icon="brush" label="آثار در سامانه" value={faNum(admin.stats.artworks)} />
                <Stat icon="receipt_long" label="سفارش‌ها" value={faNum(admin.stats.orders)} />
                <Stat icon="payments" label="گردش مالی سفارش‌ها" value={faPrice(admin.stats.revenue)} unit="تومان" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <ActionCard icon="how_to_reg" label="درخواست عضویت جدید" value={faNum(admin.stats.pendingMembers)} onClick={() => setSection("artisans")} />
                <ActionCard icon="hourglass_top" label="آثار در صف کارشناسی" value={faNum(admin.stats.pendingArtworks)} onClick={() => setSection("verifications")} />
                <ActionCard icon="support_agent" label="پیام پاسخ‌داده‌نشده" value={faNum(admin.stats.messages)} onClick={() => setSection("support")} />
              </div>

              {/* Recent member requests */}
              <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <h2 className="font-headline-sm text-primary font-bold mb-3">درخواست‌های جدید پیوستن استادکاران به گنجینه</h2>
                {admin.memberRequests.filter((m) => m.status === "PENDING").length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-3 text-center">درخواست در انتظاری وجود ندارد.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {admin.memberRequests
                      .filter((m) => m.status === "PENDING")
                      .slice(0, 3)
                      .map((m) => (
                        <div key={m.id} className="flex items-center justify-between gap-2 bg-surface-container-low rounded-xl p-3 flex-wrap">
                          <div className="text-[11px]">
                            <p className="font-bold text-primary">{m.workshop}</p>
                            <p className="text-outline">
                              {m.userName} • {m.province}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => run(() => decideMemberRequestAction(m.id, "APPROVED"), "عضویت")}
                              className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container transition"
                            >
                              تایید عضویت
                            </button>
                            <button
                              onClick={() => run(() => decideMemberRequestAction(m.id, "REJECTED"), "عضویت")}
                              className="px-3 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[11px] font-bold hover:bg-error-container transition"
                            >
                              رد درخواست
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </section>

              {/* Audit preview */}
              <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <h2 className="font-headline-sm text-primary font-bold mb-3">ثبت رویدادهای مدیریتی (Audit Log)</h2>
                <div className="flex flex-col gap-2">
                  {admin.audit.slice(0, 5).map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-[11px] bg-surface-container-low rounded-xl p-2.5">
                      <div>
                        <span className="font-bold text-primary">{a.action}</span>
                        <span className="text-outline"> — {a.target ?? ""}</span>
                        <p className="text-outline">{a.detail}</p>
                      </div>
                      <span className="text-outline shrink-0">{faDateTime(a.createdAt)}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}

          {section === "artisans" && (
            <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
              <h2 className="font-headline-sm text-primary font-bold mb-3">درخواست‌های پیوستن استادکاران</h2>
              {admin.memberRequests.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 text-center">درخواستی ثبت نشده است.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {admin.memberRequests.map((m) => (
                    <div key={m.id} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                      <div className="text-[11px]">
                        <p className="font-bold text-primary">
                          {m.workshop} <span className={cn("rounded-full px-2 py-0.5 ml-1", m.status === "PENDING" ? "bg-tertiary-fixed text-on-tertiary-fixed" : m.status === "APPROVED" ? "bg-secondary/15 text-secondary" : "bg-error-container text-on-error-container")}>
                            {m.status === "PENDING" ? "در انتظار" : m.status === "APPROVED" ? "تاییدشده" : "رد‌شده"}
                          </span>
                        </p>
                        <p className="text-outline">
                          {m.userName} ({m.userEmail}) • {m.province} {m.portfolio ? `• نمونه‌کار: ${m.portfolio}` : ""}
                        </p>
                        <p className="text-outline">{faDateTime(m.createdAt)}</p>
                      </div>
                      {m.status === "PENDING" && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => run(() => decideMemberRequestAction(m.id, "APPROVED"), "عضویت")}
                            className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[11px] font-bold hover:bg-primary-container transition"
                          >
                            تایید و فعال‌سازی غرفه
                          </button>
                          <button
                            onClick={() => run(() => decideMemberRequestAction(m.id, "REJECTED"), "عضویت")}
                            className="px-3 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[11px] font-bold hover:bg-error-container transition"
                          >
                            رد
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "plans" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {admin.plans.map((p) => (
                <div
                  key={p.id}
                  className={cn(
                    "bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-2 border-2",
                    p.highlight ? "border-tertiary-fixed-dim" : "border-transparent"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-headline-sm text-primary font-bold">{p.title}</h3>
                    {p.tag && (
                      <span className="text-[10px] font-bold bg-tertiary-fixed/60 text-on-tertiary-fixed-variant rounded-full px-2.5 py-1">
                        {p.tag}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-headline-md font-black text-primary">{p.priceToman === 0 ? "رایگان" : faPrice(p.priceToman)}</span>
                    <span className="text-[11px] text-outline">
                      {p.periodDays === 0 ? "تومان" : `تومان / ${p.periodDays >= 365 ? "سالانه" : `${Math.round(p.periodDays / 30)} ماهه`}`}
                    </span>
                  </div>
                  <div className="text-[11px] text-on-tertiary-container font-bold flex flex-wrap gap-x-3">
                    <span>سقف: {p.maxActiveListings === null ? "نامحدود" : `${p.maxActiveListings} آگهی`}</span>
                    <span>کارمزد آگهی: {p.listingFeeToman === 0 ? "صفر" : faPrice(p.listingFeeToman)}</span>
                    <span>کارمزد فروش: {p.commissionBps / 100}٪</span>
                  </div>
                  <ul className="text-[11px] text-on-surface-variant flex flex-col gap-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-1.5">
                        <MSymbol name="check_circle" size={13} className="text-secondary shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-2 border-t border-outline-variant/30 text-[10px] text-outline flex justify-between">
                    <span>شناسه: {p.id}</span>
                    <span>{p.highlight ? "پیشنهاد ویژه" : ""}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {section === "transactions" && (
            <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
              <h2 className="font-headline-sm text-primary font-bold mb-3">دفتر تراکنش‌ها و درآمدهای پلتفرم</h2>
              {admin.transactions.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 text-center">تراکنشی ثبت نشده است.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[560px]">
                    <thead>
                      <tr className="text-outline border-b border-outline-variant/40">
                        <th className="py-2 text-right font-medium">شرح</th>
                        <th className="py-2 text-right font-medium">نوع</th>
                        <th className="py-2 text-left font-medium">مبلغ</th>
                        <th className="py-2 text-right font-medium">تاریخ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admin.transactions.map((t) => (
                        <tr key={t.id} className="border-b border-outline-variant/30 last:border-0">
                          <td className="py-2.5 text-on-surface-variant">{t.detail ?? "—"}</td>
                          <td className="py-2.5">
                            <span className="font-bold text-on-tertiary-container">
                              {t.kind === "SALE" ? "فروش" : t.kind === "COMMISSION" ? "کارمزد" : t.kind === "PAYOUT" ? "واریز" : "اشتراک"}
                            </span>
                          </td>
                          <td className={cn("py-2.5 text-left font-black", t.amount >= 0 ? "text-secondary" : "text-error")} dir="ltr">
                            {faPrice(t.amount)} ت
                          </td>
                          <td className="py-2.5 text-outline">{faDateTime(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <p className="text-[10px] text-outline mt-3">
                مبلغ‌ها از دفتر حسابی واقعی سرور خوانده می‌شود؛ در محیط نمایشی هیچ گردش پول واقعی وجود ندارد.
              </p>
            </section>
          )}

          {section === "discounts" && <AdminDiscountsSection data={data} refresh={refresh} />}

          {section === "verifications" && (
            <div className="flex flex-col gap-4">
              <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <h2 className="font-headline-sm text-primary font-bold mb-3">کارشناسی آثار و آزمایشگاه اصالت</h2>
                {admin.labQueue.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-4 text-center">پرونده‌ای وجود ندارد.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {admin.labQueue.map((r) => (
                      <div key={r.id} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-[11px]">
                          <p className="font-bold text-primary line-clamp-1">{r.title}</p>
                          <p className="text-outline">
                            {r.code} • {r.sellerName} • هولوگرام: <span className="font-mono">{r.hologramCode}</span>
                          </p>
                          <p className="text-outline mt-0.5">
                            {r.status === "VERIFIED" ? "شناسنامه صادرشده" : r.status === "REJECTED" ? "رد‌شده" : "در انتظار تایید"}
                            {" • "}
                            وضعیت آزمایشگاه: {r.labStatus}
                          </p>
                        </div>
                        <div className="flex gap-1.5 flex-wrap">
                          {r.labStatus !== "IN_LAB" && r.labStatus !== "TESTS_DONE" && r.labStatus !== "ISSUED" && (
                            <button
                              onClick={() => run(() => updateLabStatusAction(r.id, "IN_LAB"), "آزمایشگاه")}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-primary text-[10px] font-bold hover:bg-surface-container-highest transition"
                            >
                              شروع آزمون
                            </button>
                          )}
                          {r.labStatus === "IN_LAB" && (
                            <button
                              onClick={() => run(() => updateLabStatusAction(r.id, "TESTS_DONE"), "آزمایشگاه")}
                              className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-primary text-[10px] font-bold hover:bg-surface-container-highest transition"
                            >
                              ثبت نتایج آزمون
                            </button>
                          )}
                          {r.labStatus === "TESTS_DONE" && (
                            <button
                              onClick={() => run(() => updateLabStatusAction(r.id, "ISSUED"), "آزمایشگاه")}
                              className="px-2.5 py-1.5 rounded-lg bg-secondary text-white text-[10px] font-bold hover:bg-primary transition"
                            >
                              صدور شناسنامه اصالت
                            </button>
                          )}
                          {r.status === "VERIFIED" ? (
                            <span className="px-2.5 py-1.5 rounded-lg bg-secondary/15 text-secondary text-[10px] font-bold">تایید شده</span>
                          ) : (
                            r.status !== "REJECTED" && (
                              <button
                                onClick={() => run(() => decideArtworkVerificationAction(r.id, "REJECTED", "عدم تطابق با استانداردهای ریشه"), "کارشناسی")}
                                className="px-2.5 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[10px] font-bold hover:bg-error-container transition"
                              >
                                رد اثر
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <h2 className="font-headline-sm text-primary font-bold mb-3">درخواست‌های تسویه استادکاران (نمایشی)</h2>
                {admin.payouts.length === 0 ? (
                  <p className="text-xs text-on-surface-variant py-4 text-center">درخواست تسویه‌ای ثبت نشده است.</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {admin.payouts.map((s) => (
                      <div key={s.id} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
                        <div className="text-[11px]">
                          <p className="font-bold text-primary">
                            {s.sellerName} — {faPrice(s.amount)} تومان
                          </p>
                          <p className="text-outline font-mono" dir="ltr">
                            {s.iban}
                          </p>
                          <p className="text-outline">{faDateTime(s.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "text-[10px] font-bold rounded-full px-2.5 py-1",
                              s.status === "PAID"
                                ? "bg-secondary/15 text-secondary"
                                : s.status === "REJECTED"
                                  ? "bg-error-container text-on-error-container"
                                  : "bg-tertiary-fixed text-on-tertiary-fixed"
                            )}
                          >
                            {s.status === "PAID" ? "واریز شده" : s.status === "REJECTED" ? "رد‌شده" : s.status === "APPROVED" ? "تاییدشده" : "در انتظار"}
                          </span>
                          {s.status === "PENDING" && (
                            <>
                              <button
                                onClick={() => run(() => decidePayoutAction(s.id, "APPROVED"), "تسویه")}
                                className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold hover:bg-primary-container transition"
                              >
                                تایید
                              </button>
                              <button
                                onClick={() => run(() => decidePayoutAction(s.id, "REJECTED", "عدم انطباق اطلاعات شبا"), "تسویه")}
                                className="px-2.5 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[10px] font-bold hover:bg-error-container transition"
                              >
                                رد
                              </button>
                            </>
                          )}
                          {s.status === "APPROVED" && (
                            <>
                              <button
                                onClick={() => run(() => decidePayoutAction(s.id, "PAID"), "واریز تسویه")}
                                className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-[10px] font-bold hover:brightness-110 transition"
                              >
                                واریز (نمایشی)
                              </button>
                            </>
                          )}
                          {false && (
                            <button
                              onClick={() => run(() => decideSettlementAction(s.id, "PAID"), "تسویه")}
                              className="px-2.5 py-1.5 rounded-lg bg-secondary text-white text-[10px] font-bold hover:bg-primary transition"
                            >
                              ثبت واریز شبا (نمایشی)
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-outline mt-3">
                  «ثبت واریز» تنها وضعیت دفتری را به‌روزرسانی می‌کند؛ در حالت نمایشی، انتقال پول واقعی انجام
                  نمی‌شود و برای تسویه واقعی به پیکربندی سرویس بانکی نیاز است.
                </p>
              </section>
            </div>
          )}

          {section === "support" && (
            <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
              <h2 className="font-headline-sm text-primary font-bold mb-3">پیام‌ها و تیکت‌های پشتیبانی</h2>
              {admin.messages.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 text-center">پیامی ثبت نشده است.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {admin.messages.map((m) => (
                    <div key={m.id} className={cn("rounded-xl p-3", m.handled ? "bg-surface-container-low opacity-70" : "bg-surface-container-low")}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] font-bold text-primary">
                          {m.name} <span className="text-outline font-normal">({m.email})</span>
                          {m.subject && <span className="text-outline font-normal"> • {m.subject}</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-outline">{faDateTime(m.createdAt)}</span>
                          {!m.handled ? (
                            <button
                              onClick={() => run(() => markMessageHandledAction(m.id), "پشتیبانی")}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold hover:bg-primary-container transition"
                            >
                              علامت‌گذاری بررسی‌شده
                            </button>
                          ) : (
                            <span className="text-[10px] font-bold text-secondary">بررسی‌شده</span>
                          )}
                        </div>
                      </div>
                      <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">{m.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "audit" && (
            <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
              <h2 className="font-headline-sm text-primary font-bold mb-3">گزارش کامل رخدادهای سامانه</h2>
              <div className="flex flex-col gap-2">
                {admin.audit.map((a) => (
                  <div key={a.id} className="flex items-center justify-between text-[11px] bg-surface-container-low rounded-xl p-2.5">
                    <div>
                      <span className="font-bold text-primary">{a.action}</span>
                      <span className="text-outline"> — {a.target ?? "—"}</span>
                      <p className="text-outline">{a.detail}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-outline" dir="ltr">
                        {a.actor}
                      </p>
                      <p className="text-outline">{faDateTime(a.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {section === "returns" && (
            <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
              <h2 className="font-headline-sm text-primary font-bold mb-3">درخواست‌های مرجوعی</h2>
              {admin.returns.length === 0 ? (
                <p className="text-xs text-on-surface-variant py-4 text-center">درخواست مرجوعی‌ای ثبت نشده است.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {admin.returns.map((r) => (
                    <div key={r.id} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between gap-2 flex-wrap">
                      <div className="text-[11px]">
                        <p className="font-bold text-primary">
                          «{r.itemTitle}» — سفارش {r.orderNumber}
                        </p>
                        <p className="text-outline">
                          خریدار: {r.buyerName} • فروشنده: {r.sellerName} • دلیل: {r.reason}
                        </p>
                        <p className="text-outline">{faDateTime(r.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold rounded-full px-2.5 py-1 bg-surface-container text-on-surface-variant">
                          {r.status}
                        </span>
                        {r.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => run(() => decideReturnStatusAction({ returnId: r.id, decision: "APPROVED" }), "مرجوعی")}
                              className="px-2.5 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold"
                            >
                              تایید
                            </button>
                            <button
                              onClick={() => run(() => decideReturnStatusAction({ returnId: r.id, decision: "REJECTED" }), "مرجوعی")}
                              className="px-2.5 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[10px] font-bold"
                            >
                              رد
                            </button>
                          </>
                        )}
                        {r.status === "RECEIVED" && (
                          <button
                            onClick={() => run(() => decideReturnStatusAction({ returnId: r.id, decision: "REFUNDED" }), "بازگشت وجه")}
                            className="px-2.5 py-1.5 rounded-lg bg-secondary text-on-secondary text-[10px] font-bold"
                          >
                            بازگشت وجه (نمایشی)
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          {section === "platform" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-headline-sm text-primary font-bold">درآمد پلتفرم بر اساس نوع</h2>
                  <a
                    href="/api/admin/revenue.csv"
                    className="text-[11px] font-bold text-secondary hover:text-primary"
                  >
                    دریافت CSV
                  </a>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {admin.revenueByKind.map((k) => (
                    <div key={k.kind} className="bg-surface-container-low rounded-xl p-3 text-center">
                      <p className="text-[10px] text-on-surface-variant">
                        {k.kind === "COMMISSION" ? "کارمزد فروش" : k.kind === "LISTING_FEE" ? "کارمزد آگهی" : "اشتراک"}
                      </p>
                      <p className="text-sm font-black text-primary">{faPrice(k.amount)}</p>
                    </div>
                  ))}
                </div>
                <h3 className="text-xs font-bold text-primary mb-2">اشتراک‌های فعال و اخیر</h3>
                <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                  {admin.subscriptions.map((sub) => (
                    <div key={sub.id} className="text-[11px] bg-surface-container-low rounded-lg px-3 py-2 flex items-center justify-between">
                      <span className="text-on-surface">{sub.sellerName} — {sub.planTitle}</span>
                      <span className={cn("font-bold", sub.status === "ACTIVE" ? "text-secondary" : "text-outline")}>
                        {sub.status === "ACTIVE" ? "فعال تا " + faDateTime(sub.expiresAt) : sub.status}
                      </span>
                    </div>
                  ))}
                </div>
                <h3 className="text-xs font-bold text-primary mt-4 mb-2">تخصیص دستی اشتراک (S5)</h3>
                <AssignSubscriptionForm run={run} />
              </section>

              <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <h2 className="font-headline-sm text-primary font-bold mb-1">تنظیمات اقتصادی پلتفرم</h2>
                <p className="text-[11px] text-outline mb-3">
                  همه‌ی نرخ‌ها و مهلت‌ها از همین جدول خوانده می‌شوند؛ هیچ مقدار ثابتی در کد نیست.
                </p>
                <div className="flex flex-col gap-2">
                  {Object.entries(admin.settings).map(([key, value]) => (
                    <SettingRow key={key} settingKey={key} value={value} run={run} />
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SettingRow({
  settingKey,
  value,
  run,
}: {
  settingKey: string;
  value: string;
  run: (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, title: string) => Promise<void>;
}) {
  const [v, setV] = useState(value);
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-on-surface-variant w-56 shrink-0" dir="ltr" style={{ textAlign: "left" }}>
        {settingKey}
      </span>
      <input
        value={v}
        onChange={(e) => setV(e.target.value)}
        dir="ltr"
        className="w-24 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-1.5 text-xs text-left"
      />
      <button
        onClick={() => run(() => updateSettingAction(settingKey, v), "تنظیمات")}
        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold"
      >
        ذخیره
      </button>
    </div>
  );
}

function AssignSubscriptionForm({
  run,
}: {
  run: (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, title: string) => Promise<void>;
}) {
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("bronze");
  const [months, setMonths] = useState("12");
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="رایانامه استادکار"
        dir="ltr"
        className="flex-1 min-w-40 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-1.5 text-xs text-left"
      />
      <select
        value={planId}
        onChange={(e) => setPlanId(e.target.value)}
        className="rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-1.5 text-xs"
      >
        <option value="free">رایگان</option>
        <option value="bronze">برنز</option>
        <option value="silver">نقره</option>
        <option value="gold">طلایی</option>
      </select>
      <input
        value={months}
        onChange={(e) => setMonths(e.target.value)}
        placeholder="ماه"
        dir="ltr"
        className="w-16 rounded-lg border border-outline-variant/40 bg-surface-container-low px-2 py-1.5 text-xs text-left"
      />
      <button
        onClick={() => run(() => assignSubscriptionAction({ sellerEmail: email, planId, months: Number(months) || 12 }), "اشتراک دستی")}
        className="px-3 py-1.5 rounded-lg bg-primary text-on-primary text-[10px] font-bold"
      >
        تخصیص دستی
      </button>
    </div>
  );
}

function Stat({ icon, label, value, unit }: { icon: string; label: string; value: string; unit?: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <MSymbol name={icon} size={16} className="text-secondary" />
        {label}
      </span>
      <span className="flex items-baseline gap-1">
        <span className="text-headline-md font-black text-primary">{value}</span>
        {unit && <span className="text-[10px] text-outline">{unit}</span>}
      </span>
    </div>
  );
}

function ActionCard({ icon, label, value, onClick }: { icon: string; label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 text-right hover:elevation-2 transition-all flex items-center justify-between"
    >
      <div className="flex items-center gap-2.5">
        <div className="w-10 h-10 rounded-xl bg-tertiary-fixed/60 text-on-tertiary-fixed-variant flex items-center justify-center">
          <MSymbol name={icon} size={20} />
        </div>
        <span className="text-xs font-bold text-primary">{label}</span>
      </div>
      <span className="text-headline-md font-black text-on-tertiary-container">{value}</span>
    </button>
  );
}
