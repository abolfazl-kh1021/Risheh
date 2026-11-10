"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDate, faNum, DISCOUNT_AUDIENCE_FA, discountValueFa } from "@/lib/fa";
import {
  checkDiscountCodeAction,
  claimDiscountCodeAction,
  joinCampaignAction,
  leaveCampaignAction,
  type DiscountCheckResult,
} from "@/lib/actions/discounts";
import type { AppData, DiscountCodeDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void; refresh: () => void };

/** Live status of a claimed code, computed from the server snapshot. */
function liveStatus(c: DiscountCodeDTO): { label: string; tone: "ok" | "warn" | "bad" } {
  const now = Date.now();
  if (!c.active) return { label: "غیرفعال شده", tone: "bad" };
  if (c.startsAt && new Date(c.startsAt).getTime() > now) return { label: "هنوز شروع نشده", tone: "warn" };
  if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return { label: "منقضی شده", tone: "bad" };
  if ((c.remaining ?? 0) <= 0) return { label: "ظرفیت تکمیل شده", tone: "bad" };
  if ((c.myUses ?? 0) >= c.perUserLimit) return { label: "دریافت‌شده", tone: "warn" };
  return { label: "معتبر — آماده استفاده", tone: "ok" };
}

const TONE_CLASSES = {
  ok: "bg-secondary-container text-on-secondary-container",
  warn: "bg-tertiary-fixed text-on-tertiary-fixed",
  bad: "bg-error-container text-on-error-container",
} as const;

export function DiscountsView({ data, navigate, refresh }: Props) {
  const { toast } = useToast();
  const user = data.user;
  const discounts = data.discounts;

  // ---- validity checker state ----
  const [rawCode, setRawCode] = useState("");
  const [checking, setChecking] = useState(false);
  const [checkResult, setCheckResult] = useState<DiscountCheckResult | null>(null);
  const [claimingCode, setClaimingCode] = useState<string | null>(null);
  const [busyArtwork, setBusyArtwork] = useState<string | null>(null);

  const codes = discounts?.codes ?? [];
  const campaigns = discounts?.campaigns ?? [];

  const myCodes = useMemo(() => codes.filter((c) => c.claimedByMe), [codes]);
  const isArtisan = user?.role === "ARTISAN";
  const myPublishedArtworks = useMemo(
    () => (isArtisan ? (data.myArtworks ?? []).filter((a) => a.status === "PUBLISHED") : []),
    [isArtisan, data.myArtworks]
  );

  const run = async (
    fn: () => Promise<{ ok: boolean; message?: string; error?: string }>,
    fallbackTitle: string
  ) => {
    const res = await fn();
    if (res.ok) {
      toast({ title: fallbackTitle, description: res.message });
      refresh();
    } else {
      toast({ title: "خطا", description: res.error ?? "عملیات ناموفق بود.", variant: "destructive" });
    }
  };

  const handleCheck = async () => {
    if (!rawCode.trim()) {
      toast({ title: "بررسی اعتبار", description: "کد تخفیف را وارد کنید.", variant: "destructive" });
      return;
    }
    setChecking(true);
    setCheckResult(null);
    try {
      const res = await checkDiscountCodeAction(rawCode);
      setCheckResult(res);
    } catch {
      toast({ title: "خطا", description: "بررسی کد ناموفق بود.", variant: "destructive" });
    } finally {
      setChecking(false);
    }
  };

  const handleClaim = async (code: DiscountCodeDTO) => {
    if (!user || user.role === "ADMIN") {
      toast({
        title: "ورود لازم است",
        description: "دریافت کد تخفیف نیازمند ورود با حساب مشتری یا استادکار است.",
        variant: "destructive",
      });
      navigate("login");
      return;
    }
    setClaimingCode(code.id);
    try {
      await run(() => claimDiscountCodeAction(code.code), "کد تخفیف");
    } finally {
      setClaimingCode(null);
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      toast({ title: "کپی شد", description: `کد «${code}» در حافظه قرار گرفت.` });
    } catch {
      toast({ title: "کپی نشد", description: "کد را به‌صورت دستی یادداشت کنید.", variant: "destructive" });
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      {/* Hero */}
      <div className="bg-gradient-to-l from-primary-container to-primary text-surface-bright rounded-3xl p-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-headline-lg font-bold">تخفیف‌ها و کدهای هدیه ریشه</h1>
          <p className="text-xs text-on-primary-container mt-1">
            کمپین‌های مناسبت‌دار، کدهای هدیه مشتریان و استادکاران — اعتبار کدها به‌صورت برخط در سرور بررسی می‌شود
          </p>
        </div>
        <span className="bg-tertiary-fixed-dim text-tertiary-container rounded-full px-4 py-2 text-xs font-bold flex items-center gap-1.5">
          <MSymbol name="sell" size={15} />
          کدهای فعال: {faNum(codes.length)}
        </span>
      </div>

      {!user && (
        <div className="mt-4 bg-secondary-container/60 text-on-secondary-container rounded-2xl p-4 flex items-center justify-between flex-wrap gap-2">
          <p className="text-xs font-bold flex items-center gap-2">
            <MSymbol name="info" size={18} />
            برای دریافت کد تخفیف و مشاهده «کدهای من» ابتدا وارد حساب خود شوید.
          </p>
          <button
            onClick={() => navigate("login")}
            className="bg-primary text-on-primary rounded-xl px-4 py-2 text-xs font-bold hover:bg-primary-container transition"
          >
            ورود | ثبت‌نام
          </button>
        </div>
      )}

      {/* ---- Validity checker (استعلام اعتبار کد) ---- */}
      <section className="mt-4 bg-surface-container-lowest rounded-2xl elevation-1 p-4 md:p-5">
        <h2 className="font-headline-sm text-primary font-bold flex items-center gap-2">
          <MSymbol name="qr_code_scanner" size={20} className="text-secondary" />
          بررسی اعتبار کد تخفیف
        </h2>
        <p className="text-[11px] text-on-surface-variant mt-1">
          کد خود را وارد کنید تا وضعیت آن (معتبر، منقضی، تکمیل ظرفیت یا خارج از سهمیه) با رنگ‌بندی نشان داده شود.
        </p>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <input
            value={rawCode}
            onChange={(e) => setRawCode(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCheck()}
            placeholder="مثلاً YALDA-1405"
            dir="ltr"
            className="flex-1 bg-surface-container-low rounded-xl px-4 py-3 text-sm font-mono text-on-surface border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary text-left placeholder:text-right placeholder:font-sans"
            aria-label="کد تخفیف"
          />
          <button
            onClick={handleCheck}
            disabled={checking}
            className="bg-primary text-on-primary rounded-xl px-6 py-3 text-sm font-bold hover:bg-primary-container transition disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <MSymbol name={checking ? "hourglass_top" : "task_alt"} size={18} />
            {checking ? "در حال بررسی…" : "بررسی اعتبار"}
          </button>
        </div>

        {checkResult && checkResult.ok && (
          <div
            className={cn(
              "mt-3 rounded-2xl p-4 flex flex-col gap-2",
              checkResult.status === "VALID"
                ? TONE_CLASSES.ok
                : ["EXPIRED", "NOT_FOUND", "INACTIVE"].includes(checkResult.status)
                  ? TONE_CLASSES.bad
                  : TONE_CLASSES.warn
            )}
            role="status"
          >
            <p className="text-sm font-bold flex items-center gap-2">
              <MSymbol
                name={
                  checkResult.status === "VALID"
                    ? "check_circle"
                    : ["EXPIRED", "NOT_FOUND", "INACTIVE"].includes(checkResult.status)
                      ? "cancel"
                      : "hourglass_top"
                }
                size={22}
              />
              {checkResult.message}
            </p>
            {"info" in checkResult && checkResult.status === "VALID" && (
              <div className="text-[11px] flex flex-wrap gap-x-4 gap-y-1 opacity-90">
                <span>کد: <span className="font-mono font-bold" dir="ltr">{checkResult.info.code}</span></span>
                <span>{discountValueFa(checkResult.info.kind, checkResult.info.amount)}</span>
                {checkResult.info.minPrice ? <span>حداقل سبد: {faNum(checkResult.info.minPrice)} تومان</span> : null}
                {checkResult.info.maxPrice ? <span>سقف تخفیف: {faNum(checkResult.info.maxPrice)} تومان</span> : null}
                <span>ظرفیت باقی‌مانده: {faNum(checkResult.info.remaining)}</span>
                <span>{DISCOUNT_AUDIENCE_FA[checkResult.info.audience] ?? checkResult.info.audience}</span>
                {checkResult.info.expiresAt ? <span>مهلت: تا {faDate(checkResult.info.expiresAt)}</span> : <span>بدون مهلت انقضا</span>}
              </div>
            )}
          </div>
        )}
      </section>

      {/* ---- Active codes ---- */}
      <section className="mt-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
            <MSymbol name="card_giftcard" size={22} className="text-secondary" />
            کدهای تخفیف فعال
          </h2>
          <span className="text-[11px] text-outline">کد را دریافت کنید تا در «کدهای من» ثبت شود</span>
        </div>
        {codes.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-8 text-center">
            <MSymbol name="sell" size={32} className="text-outline" />
            <p className="text-xs text-on-surface-variant mt-2">در حال حاضر کد فعالی وجود ندارد؛ به‌زودی با مناسبت‌های جدید برگردیم.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {codes.map((c) => {
              const mine = !!c.claimedByMe;
              const status = mine ? liveStatus(c) : null;
              const roleBlocked =
                !!user && user.role !== "ADMIN" && c.audience !== "ALL" && c.audience !== user.role;
              const unavailable = (c.remaining ?? 0) <= 0 || !c.active;
              return (
                <div key={c.id} className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary line-clamp-1">{c.title}</p>
                      {c.campaignTitle && <p className="text-[10px] text-outline mt-0.5">کمپین: {c.campaignTitle}</p>}
                    </div>
                    <span className="shrink-0 text-[10px] font-bold bg-primary-fixed text-on-primary-fixed-variant rounded-full px-2.5 py-1">
                      {DISCOUNT_AUDIENCE_FA[c.audience] ?? c.audience}
                    </span>
                  </div>
                  <button
                    onClick={() => copyCode(c.code)}
                    className="self-start bg-surface-container-low rounded-xl px-3 py-2 flex items-center gap-2 hover:bg-surface-container-high transition group"
                    title="کپی کد"
                  >
                    <span className="font-mono font-black text-base text-primary tracking-wide" dir="ltr">{c.code}</span>
                    <MSymbol name="assignment" size={16} className="text-outline group-hover:text-secondary transition-colors" />
                  </button>
                  <p className="text-xs font-black text-on-tertiary-container">{discountValueFa(c.kind, c.amount)}</p>
                  <ul className="text-[10px] text-on-surface-variant flex flex-col gap-1">
                    {c.minPrice ? (
                      <li className="flex items-center gap-1.5">
                        <MSymbol name="shopping_basket" size={13} className="text-outline shrink-0" />
                        حداقل مبلغ سبد: {faNum(c.minPrice)} تومان
                      </li>
                    ) : null}
                    {c.maxPrice && c.kind === "PERCENT" ? (
                      <li className="flex items-center gap-1.5">
                        <MSymbol name="payments" size={13} className="text-outline shrink-0" />
                        سقف تخفیف: {faNum(c.maxPrice)} تومان
                      </li>
                    ) : null}
                    <li className="flex items-center gap-1.5">
                      <MSymbol name="schedule" size={13} className="text-outline shrink-0" />
                      {c.expiresAt ? `مهلت استفاده: تا ${faDate(c.expiresAt)}` : "بدون مهلت انقضا"}
                    </li>
                    <li className="flex items-center gap-1.5">
                      <MSymbol name="inventory" size={13} className="text-outline shrink-0" />
                      ظرفیت باقی‌مانده: {faNum(c.remaining ?? 0)} از {faNum(c.maxUses)}
                    </li>
                  </ul>
                  <div className="mt-auto pt-2">
                    {mine && status ? (
                      <div className={cn("rounded-xl px-3 py-2.5 text-[11px] font-bold flex items-center justify-between", TONE_CLASSES[status.tone])}>
                        <span>{status.label}</span>
                        <MSymbol name={status.tone === "ok" ? "check_circle" : status.tone === "warn" ? "history" : "cancel"} size={16} />
                      </div>
                    ) : unavailable ? (
                      <div className="rounded-xl px-3 py-2.5 text-[11px] font-bold flex items-center justify-between bg-error-container text-on-error-container">
                        <span>{!c.active ? "این کد غیرفعال شده است" : "ظرفیت این کد تکمیل شده است"}</span>
                        <MSymbol name="cancel" size={16} />
                      </div>
                    ) : roleBlocked ? (
                      <div className="rounded-xl px-3 py-2.5 text-[11px] font-bold flex items-center justify-between bg-tertiary-fixed text-on-tertiary-fixed">
                        <span>{DISCOUNT_AUDIENCE_FA[c.audience] ?? c.audience} — برای حساب شما فعال نیست</span>
                        <MSymbol name="lock_person" size={16} />
                      </div>
                    ) : (
                      <button
                        onClick={() => handleClaim(c)}
                        disabled={claimingCode === c.id}
                        className="w-full bg-primary text-on-primary rounded-xl px-3 py-2.5 text-xs font-bold hover:bg-primary-container transition disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        <MSymbol name="card_giftcard" size={16} />
                        {claimingCode === c.id ? "در حال ثبت…" : "دریافت کد تخفیف"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* ---- Occasion campaigns ---- */}
      <section className="mt-space-lg">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
          <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
            <MSymbol name="sell" size={22} className="text-secondary" />
            کمپین‌های مناسبت‌دار
          </h2>
          <span className="text-[11px] text-outline">آثار منتخب استادکاران در مناسبت‌های ویژه</span>
        </div>
        {campaigns.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-8 text-center">
            <MSymbol name="storefront" size={32} className="text-outline" />
            <p className="text-xs text-on-surface-variant mt-2">کمپین فعالی در جریان نیست.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {campaigns.map((cp) => (
              <div key={cp.id} className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-headline-sm text-primary font-bold">{cp.title}</h3>
                    <p className="text-[11px] text-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap">
                      <span className="bg-tertiary-fixed/70 text-on-tertiary-fixed-variant rounded-full px-2.5 py-0.5 font-bold">{cp.occasion}</span>
                      <span className="flex items-center gap-1">
                        <MSymbol name="schedule" size={13} />
                        تا {faDate(cp.endsAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MSymbol name="group" size={13} />
                        {faNum(cp.artworks.length)} اثر از استادکاران
                      </span>
                      {cp.codeCount > 0 && (
                        <span className="flex items-center gap-1">
                          <MSymbol name="card_giftcard" size={13} />
                          {faNum(cp.codeCount)} کد تخفیف مرتبط
                        </span>
                      )}
                    </p>
                    {cp.description && <p className="text-[11px] text-outline mt-1">{cp.description}</p>}
                  </div>
                </div>
                {cp.artworks.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mt-3">
                    {cp.artworks.slice(0, 8).map((a) => (
                      <button
                        key={a.artworkId}
                        onClick={() => navigate(`product/${a.slug}`)}
                        className="text-right bg-surface-container-low rounded-xl overflow-hidden hover:elevation-2 transition-all flex flex-col"
                      >
                        <img src={a.image} alt={a.title} className="w-full aspect-square object-cover" loading="lazy" />
                        <div className="p-2.5 flex flex-col gap-1">
                          <p className="text-[11px] font-bold text-primary line-clamp-1">{a.title}</p>
                          <p className="text-[10px] text-outline line-clamp-1">{a.artisanName}</p>
                          <p className="text-[11px] font-black text-on-tertiary-container">{faNum(a.price)} تومان</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ---- My codes ---- */}
      {user && user.role !== "ADMIN" && (
        <section className="mt-space-lg bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
            <MSymbol name="history" size={22} className="text-secondary" />
            کدهای من
          </h2>
          <p className="text-[11px] text-on-surface-variant mt-1">
            کدهایی که دریافت کرده‌اید؛ وضعیت اعتبار هر کد به‌صورت زنده از سرور به‌روزرسانی می‌شود.
          </p>
          {myCodes.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-6 text-center">هنوز کدی دریافت نکرده‌اید؛ از بخش «کدهای تخفیف فعال» دریافت کنید.</p>
          ) : (
            <div className="flex flex-col gap-2 mt-3">
              {myCodes.map((c) => {
                const status = liveStatus(c);
                return (
                  <div key={c.id} className="bg-surface-container-low rounded-xl p-3 flex items-center justify-between flex-wrap gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-primary font-mono" dir="ltr">{c.code}</p>
                      <p className="text-[11px] text-on-surface-variant">
                        {c.title} — {discountValueFa(c.kind, c.amount)}
                        {c.expiresAt ? ` • مهلت تا ${faDate(c.expiresAt)}` : ""}
                      </p>
                    </div>
                    <span className={cn("text-[11px] font-bold rounded-full px-3 py-1.5 flex items-center gap-1.5", TONE_CLASSES[status.tone])}>
                      <MSymbol name={status.tone === "ok" ? "check_circle" : status.tone === "warn" ? "history" : "cancel"} size={14} />
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* ---- Artisan participation ---- */}
      {isArtisan && (
        <section className="mt-4 bg-surface-container-lowest rounded-2xl elevation-1 p-4">
          <h2 className="font-headline-md text-primary font-bold flex items-center gap-2">
            <MSymbol name="handshake" size={22} className="text-secondary" />
            مشارکت غرفه شما در کمپین‌ها
          </h2>
          <p className="text-[11px] text-on-surface-variant mt-1">
            آثار منتشرشده خود را به کمپین‌های مناسبت‌دار اضافه کنید تا در معرض دید خریداران مناسبت قرار بگیرد.
          </p>
          {campaigns.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-6 text-center">کمپین فعالی برای مشارکت وجود ندارد.</p>
          ) : (
            <div className="flex flex-col gap-3 mt-3">
              {campaigns.map((cp) => (
                <div key={cp.id} className="bg-surface-container-low rounded-xl p-3">
                  <p className="text-xs font-bold text-primary">
                    {cp.title} <span className="text-outline font-normal">• {cp.occasion} • تا {faDate(cp.endsAt)}</span>
                  </p>
                  {myPublishedArtworks.length === 0 ? (
                    <p className="text-[11px] text-outline py-2">اثر منتشرشده‌ای برای مشارکت ندارید.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {myPublishedArtworks.map((a) => {
                        const joined = cp.artworks.some((x) => x.artworkId === a.id);
                        return (
                          <button
                            key={a.id}
                            disabled={busyArtwork === a.id}
                            onClick={async () => {
                              setBusyArtwork(a.id);
                              try {
                                await run(
                                  () => (joined ? leaveCampaignAction(cp.id, a.id) : joinCampaignAction(cp.id, a.id)),
                                  "مشارکت در کمپین"
                                );
                              } finally {
                                setBusyArtwork(null);
                              }
                            }}
                            className={cn(
                              "rounded-xl px-3 py-2 text-[11px] font-bold flex items-center gap-1.5 transition disabled:opacity-60",
                              joined
                                ? "bg-secondary-container text-on-secondary-container hover:brightness-95"
                                : "bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-on-primary"
                            )}
                          >
                            <MSymbol name={joined ? "check_circle" : "add_circle"} size={14} />
                            {a.title}
                            {joined ? " — حاضر در کمپین" : " — افزودن"}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <p className="text-[10px] text-outline mt-4 leading-relaxed">
        ثبت کد و بررسی اعتبار در سرور انجام می‌شود؛ در نسخه نمایشی هیچ پرداخت واقعی انجام نمی‌شود و اعمال مبلغ کد در فاکتور، در جریان پرداخت نهایی رخ می‌دهد.
      </p>
    </div>
  );
}
