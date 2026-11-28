"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDate, faNum, DISCOUNT_AUDIENCE_FA, discountValueFa } from "@/lib/fa";
import {
  createDiscountCampaignAction,
  createDiscountCodeAction,
  deleteDiscountCampaignAction,
  deleteDiscountCodeAction,
  removeCampaignArtworkAction,
  resetCodeUsageAction,
  toggleDiscountCampaignAction,
  toggleDiscountCodeAction,
} from "@/lib/actions/discounts";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; refresh: () => void };

const OCCASIONS = ["شب یلدا", "نوروز", "هفته میراث فرهنگی", "روز ملی صنایع دستی", "جشن پاییزه", "سیزده‌بدر", "ماه مهر، ماه هنر"];
const CAMPAIGN_DAYS = [
  { days: 7, label: "۱ هفته" },
  { days: 14, label: "۲ هفته" },
  { days: 30, label: "۱ ماه" },
  { days: 90, label: "۳ ماه" },
];
const CODE_EXPIRY = [
  { days: 7, label: "۱ هفته" },
  { days: 30, label: "۱ ماه" },
  { days: 90, label: "۳ ماه" },
  { days: 365, label: "۱ سال" },
  { days: 0, label: "بدون انقضا" },
];

export function AdminDiscountsSection({ data, refresh }: Props) {
  const { toast } = useToast();
  const admin = data.admin!;
  const discounts = admin.discounts;
  const publishedArtworks = useMemo(
    () => (data.artworks ?? []).filter((a) => a.status === "PUBLISHED"),
    [data.artworks]
  );

  const run = async (fn: () => Promise<{ ok: boolean; message?: string; error?: string }>, title: string) => {
    const res = await fn();
    if (res.ok) {
      toast({ title, description: res.message });
      refresh();
      return true;
    }
    toast({ title: "خطا", description: res.error ?? "عملیات ناموفق بود.", variant: "destructive" });
    return false;
  };

  // ---- campaign builder ----
  const [cpTitle, setCpTitle] = useState("");
  const [cpOccasion, setCpOccasion] = useState<string>(OCCASIONS[0]);
  const [cpCustomOccasion, setCpCustomOccasion] = useState("");
  const [cpDescription, setCpDescription] = useState("");
  const [cpDays, setCpDays] = useState(14);
  const [selectedArtworks, setSelectedArtworks] = useState<Set<string>>(new Set());
  const [pickerQuery, setPickerQuery] = useState("");
  const [savingCampaign, setSavingCampaign] = useState(false);

  const pickerResults = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    const base = q
      ? publishedArtworks.filter(
          (a) => a.title.toLowerCase().includes(q) || a.seller.name.toLowerCase().includes(q) || a.code.toLowerCase().includes(q)
        )
      : publishedArtworks;
    return base.slice(0, 12);
  }, [publishedArtworks, pickerQuery]);

  const toggleSelected = (id: string) => {
    setSelectedArtworks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const submitCampaign = async () => {
    if (savingCampaign) return;
    setSavingCampaign(true);
    try {
      const occasion = cpOccasion === "__custom" ? cpCustomOccasion.trim() : cpOccasion;
      const ok = await run(
        () =>
          createDiscountCampaignAction({
            title: cpTitle.trim(),
            occasion,
            description: cpDescription.trim() || undefined,
            days: cpDays,
            artworkIds: Array.from(selectedArtworks),
          }),
        "کمپین تخفیف"
      );
      if (ok) {
        setCpTitle("");
        setCpDescription("");
        setSelectedArtworks(new Set());
        setPickerQuery("");
        setCpCustomOccasion("");
      }
    } finally {
      setSavingCampaign(false);
    }
  };

  // ---- code builder ----
  const [cdCode, setCdCode] = useState("");
  const [cdTitle, setCdTitle] = useState("");
  const [cdKind, setCdKind] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [cdAmount, setCdAmount] = useState("15");
  const [cdMaxPrice, setCdMaxPrice] = useState("");
  const [cdMinPrice, setCdMinPrice] = useState("");
  const [cdAudience, setCdAudience] = useState<"ALL" | "BUYER" | "ARTISAN">("ALL");
  const [cdMaxUses, setCdMaxUses] = useState("100");
  const [cdPerUser, setCdPerUser] = useState("1");
  const [cdCampaignId, setCdCampaignId] = useState("");
  const [cdDays, setCdDays] = useState(30);
  const [savingCode, setSavingCode] = useState(false);

  const submitCode = async () => {
    if (savingCode) return;
    setSavingCode(true);
    try {
      const ok = await run(
        () =>
          createDiscountCodeAction({
            code: cdCode.trim(),
            title: cdTitle.trim(),
            kind: cdKind,
            amount: Number(cdAmount) || 0,
            maxPrice: cdMaxPrice ? Number(cdMaxPrice) : undefined,
            minPrice: cdMinPrice ? Number(cdMinPrice) : undefined,
            audience: cdAudience,
            maxUses: Number(cdMaxUses) || 1,
            perUserLimit: Number(cdPerUser) || 1,
            campaignId: cdCampaignId || undefined,
            days: cdDays > 0 ? cdDays : undefined,
          }),
        "کد تخفیف"
      );
      if (ok) {
        setCdCode("");
        setCdTitle("");
        setCdAmount(cdKind === "PERCENT" ? "15" : "300000");
        setCdMaxPrice("");
        setCdMinPrice("");
      }
    } finally {
      setSavingCode(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon="sell" label="کدهای تعریف‌شده" value={faNum(discounts.stats.codes)} sub={`${faNum(discounts.stats.activeCodes)} کد فعال`} />
        <Stat icon="storefront" label="کمپین‌های مناسبت" value={faNum(discounts.stats.campaigns)} sub={`${faNum(discounts.stats.activeCampaigns)} کمپین جاری`} />
        <Stat icon="card_giftcard" label="دریافت/استفاده کد" value={faNum(discounts.stats.redemptions)} sub="تاکنون توسط کاربران" />
        <Stat
          icon="inventory"
          label="آثار قابل انتخاب"
          value={faNum(publishedArtworks.length)}
          sub="آثار منتشرشده استادکاران"
        />
      </div>

      {/* Campaign builder */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <h2 className="font-headline-sm text-primary font-bold mb-1 flex items-center gap-2">
          <MSymbol name="storefront" size={20} className="text-secondary" />
          ساخت کمپین مناسبت‌دار و انتخاب آثار استادکاران
        </h2>
        <p className="text-[11px] text-on-surface-variant mb-3">
          بر اساس مناسبت (یلدا، نوروز، هفته میراث…) آثار منتخب را — با هماهنگی استادکاران — به کمپین اضافه کنید؛ استادکاران نیز از صفحه تخفیف‌ها می‌توانند آثارشان را به کمپین اضافه کنند.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Field label="عنوان کمپین">
            <input
              value={cpTitle}
              onChange={(e) => setCpTitle(e.target.value)}
              placeholder="مثلاً یلدای ریشه ۱۴۰۵"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="مناسبت">
            <select
              value={cpOccasion}
              onChange={(e) => setCpOccasion(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {OCCASIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
              <option value="__custom">مناسبت دیگر…</option>
            </select>
          </Field>
          <Field label={cpOccasion === "__custom" ? "نام مناسبت" : "توضیح کوتاه (اختیاری)"}>
            {cpOccasion === "__custom" ? (
              <input
                value={cpCustomOccasion}
                onChange={(e) => setCpCustomOccasion(e.target.value)}
                placeholder="مثلاً هفته قالی دستباف"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            ) : (
              <input
                value={cpDescription}
                onChange={(e) => setCpDescription(e.target.value)}
                placeholder="توضیح نمایشی کمپین"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </Field>
          <Field label="مهلت کمپین">
            <select
              value={cpDays}
              onChange={(e) => setCpDays(Number(e.target.value))}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CAMPAIGN_DAYS.map((d) => (
                <option key={d.days} value={d.days}>{d.label}</option>
              ))}
            </select>
          </Field>
          <Field label="جستجوی اثر یا استادکار">
            <input
              value={pickerQuery}
              onChange={(e) => setPickerQuery(e.target.value)}
              placeholder="نام اثر، استادکار یا کد اثر"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <div className="flex items-end">
            <button
              onClick={submitCampaign}
              disabled={savingCampaign}
              className="w-full bg-primary text-on-primary rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-primary-container transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <MSymbol name={savingCampaign ? "hourglass_top" : "add_circle"} size={16} />
              ساخت کمپین ({faNum(selectedArtworks.size)} اثر انتخاب شده)
            </button>
          </div>
        </div>
        <div className="mt-3 max-h-56 overflow-y-auto rounded-xl border border-outline-variant/30 divide-y divide-outline-variant/20">
          {pickerResults.map((a) => {
            const picked = selectedArtworks.has(a.id);
            return (
              <button
                key={a.id}
                onClick={() => toggleSelected(a.id)}
                className={cn(
                  "w-full flex items-center gap-3 p-2.5 text-right hover:bg-surface-container-high transition",
                  picked && "bg-secondary-container/50"
                )}
              >
                <img src={a.images[0] ?? ""} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" loading="lazy" />
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-primary line-clamp-1">{a.title}</p>
                  <p className="text-[10px] text-outline">{a.seller.name} • {faNum(a.price)} تومان • {a.code}</p>
                </div>
                <MSymbol name={picked ? "check_circle" : "add_circle"} size={20} className={picked ? "text-secondary" : "text-outline"} />
              </button>
            );
          })}
          {pickerResults.length === 0 && (
            <p className="text-[11px] text-on-surface-variant py-4 text-center">اثری برای این جستجو یافت نشد.</p>
          )}
        </div>
      </section>

      {/* Campaign list */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <h2 className="font-headline-sm text-primary font-bold mb-3">کمپین‌های فعال و گذشته</h2>
        {discounts.campaigns.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-4 text-center">هنوز کمپینی ساخته نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {discounts.campaigns.map((cp) => (
              <div key={cp.id} className="bg-surface-container-low rounded-xl p-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <p className="text-xs font-bold text-primary">
                      {cp.title}
                      <span className="bg-tertiary-fixed/70 text-on-tertiary-fixed-variant rounded-full px-2 py-0.5 text-[10px] ml-1.5">{cp.occasion}</span>
                      {!cp.active && <span className="bg-error-container text-on-error-container rounded-full px-2 py-0.5 text-[10px] ml-1.5">غیرفعال</span>}
                    </p>
                    <p className="text-[10px] text-outline mt-0.5">
                      مهلت تا {faDate(cp.endsAt)} • {faNum(cp.artworks.length)} اثر • {faNum(cp.codeCount)} کد مرتبط
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <button
                      onClick={() => run(() => toggleDiscountCampaignAction(cp.id, !cp.active), "کمپین")}
                      className="px-2.5 py-1.5 rounded-lg bg-surface-container-high text-primary text-[10px] font-bold hover:bg-surface-container-highest transition"
                    >
                      {cp.active ? "غیرفعال‌سازی" : "فعال‌سازی"}
                    </button>
                    <button
                      onClick={() => run(() => deleteDiscountCampaignAction(cp.id), "کمپین")}
                      className="px-2.5 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[10px] font-bold hover:bg-error-container transition"
                    >
                      حذف
                    </button>
                  </div>
                </div>
                {cp.artworks.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {cp.artworks.map((a) => (
                      <span key={a.artworkId} className="bg-surface-container-highest text-on-surface-variant rounded-lg pl-1 pr-2.5 py-1 text-[10px] flex items-center gap-1">
                        {a.title}
                        <button
                          onClick={() => run(() => removeCampaignArtworkAction(cp.id, a.artworkId), "کمپین")}
                          className="w-5 h-5 rounded-md bg-error-container/70 text-on-error-container flex items-center justify-center hover:bg-error-container transition"
                          title="حذف از کمپین"
                        >
                          <MSymbol name="close" size={12} />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Code builder */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <h2 className="font-headline-sm text-primary font-bold mb-1 flex items-center gap-2">
          <MSymbol name="card_giftcard" size={20} className="text-secondary" />
          صدور کد تخفیف جدید
        </h2>
        <p className="text-[11px] text-on-surface-variant mb-3">
          چندین کد با شرایط مختلف (درصد یا مبلغ ثابت، مخاطب مشتری/استادکار، سقف و ظرفیت) صادر کنید.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <Field label="متن کد (انگلیسی)">
            <input
              value={cdCode}
              onChange={(e) => setCdCode(e.target.value)}
              placeholder="مثلاً YALDA-1405"
              dir="ltr"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs font-mono text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-right placeholder:font-sans"
            />
          </Field>
          <Field label="عنوان نمایشی">
            <input
              value={cdTitle}
              onChange={(e) => setCdTitle(e.target.value)}
              placeholder="مثلاً هدیه یلدای ریشه"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="نوع تخفیف">
            <select
              value={cdKind}
              onChange={(e) => {
                const k = e.target.value as "PERCENT" | "FIXED";
                setCdKind(k);
                setCdAmount(k === "PERCENT" ? "15" : "300000");
              }}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="PERCENT">درصدی</option>
              <option value="FIXED">مبلغ ثابت (تومان)</option>
            </select>
          </Field>
          <Field label={cdKind === "PERCENT" ? "درصد تخفیف (۱ تا ۱۰۰)" : "مبلغ تخفیف (تومان)"}>
            <input
              value={cdAmount}
              onChange={(e) => setCdAmount(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              dir="ltr"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          {cdKind === "PERCENT" && (
            <Field label="سقف تخفیف (تومان — اختیاری)">
              <input
                value={cdMaxPrice}
                onChange={(e) => setCdMaxPrice(e.target.value.replace(/[^\d]/g, ""))}
                inputMode="numeric"
                dir="ltr"
                placeholder="بدون سقف"
                className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-right placeholder:font-sans"
              />
            </Field>
          )}
          <Field label="حداقل مبلغ سبد (تومان — اختیاری)">
            <input
              value={cdMinPrice}
              onChange={(e) => setCdMinPrice(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              dir="ltr"
              placeholder="بدون حداقل"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-right placeholder:font-sans"
            />
          </Field>
          <Field label="مخاطب کد">
            <select
              value={cdAudience}
              onChange={(e) => setCdAudience(e.target.value as "ALL" | "BUYER" | "ARTISAN")}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="ALL">همه کاربران</option>
              <option value="BUYER">ویژه مشتریان</option>
              <option value="ARTISAN">ویژه استادکاران</option>
            </select>
          </Field>
          <Field label="ظرفیت کل">
            <input
              value={cdMaxUses}
              onChange={(e) => setCdMaxUses(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              dir="ltr"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="سهمیه هر کاربر">
            <input
              value={cdPerUser}
              onChange={(e) => setCdPerUser(e.target.value.replace(/[^\d]/g, ""))}
              inputMode="numeric"
              dir="ltr"
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label="کمپین مرتبط (اختیاری)">
            <select
              value={cdCampaignId}
              onChange={(e) => setCdCampaignId(e.target.value)}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">مستقل (بدون کمپین)</option>
              {discounts.campaigns.map((c) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          </Field>
          <Field label="مهلت اعتبار">
            <select
              value={cdDays}
              onChange={(e) => setCdDays(Number(e.target.value))}
              className="w-full bg-surface-container-low rounded-xl px-3 py-2.5 text-xs border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {CODE_EXPIRY.map((d) => (
                <option key={d.days} value={d.days}>{d.label}</option>
              ))}
            </select>
          </Field>
          <div className="flex items-end">
            <button
              onClick={submitCode}
              disabled={savingCode}
              className="w-full bg-primary text-on-primary rounded-xl px-4 py-2.5 text-xs font-bold hover:bg-primary-container transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              <MSymbol name={savingCode ? "hourglass_top" : "add_circle"} size={16} />
              صدور کد تخفیف
            </button>
          </div>
        </div>
      </section>

      {/* Codes table */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <h2 className="font-headline-sm text-primary font-bold mb-3">پنل مدیریت کدهای تخفیف</h2>
        {discounts.codes.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-4 text-center">هنوز کدی صادر نشده است.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[720px]">
              <thead>
                <tr className="text-outline border-b border-outline-variant/40">
                  <th className="py-2 text-right font-medium">کد</th>
                  <th className="py-2 text-right font-medium">شرح</th>
                  <th className="py-2 text-right font-medium">مقدار</th>
                  <th className="py-2 text-right font-medium">مخاطب</th>
                  <th className="py-2 text-right font-medium">استفاده</th>
                  <th className="py-2 text-right font-medium">مهلت</th>
                  <th className="py-2 text-left font-medium">عملیات</th>
                </tr>
              </thead>
              <tbody>
                {discounts.codes.map((c) => (
                  <tr key={c.id} className="border-b border-outline-variant/30 last:border-0">
                    <td className="py-2.5">
                      <span className={cn("font-mono font-black text-[11px]", c.active ? "text-primary" : "text-outline line-through")} dir="ltr">
                        {c.code}
                      </span>
                      {c.campaignTitle && <p className="text-[9px] text-outline">{c.campaignTitle}</p>}
                    </td>
                    <td className="py-2.5 text-on-surface-variant max-w-[180px]">
                      <p className="line-clamp-1">{c.title}</p>
                      <p className="text-[9px] text-outline">
                        {c.minPrice ? `حداقل ${faNum(c.minPrice)} تومان` : "بدون حداقل"}
                        {c.maxPrice && c.kind === "PERCENT" ? ` • سقف ${faNum(c.maxPrice)} تومان` : ""}
                      </p>
                    </td>
                    <td className="py-2.5 font-black text-on-tertiary-container whitespace-nowrap">{discountValueFa(c.kind, c.amount)}</td>
                    <td className="py-2.5 whitespace-nowrap">{DISCOUNT_AUDIENCE_FA[c.audience] ?? c.audience}</td>
                    <td className="py-2.5 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className="w-14 h-1.5 rounded-full bg-surface-container-highest overflow-hidden inline-block">
                          <span
                            className="block h-full bg-secondary rounded-full"
                            style={{ width: `${Math.min(100, Math.round((c.usedCount / Math.max(1, c.maxUses)) * 100))}%` }}
                          />
                        </span>
                        {faNum(c.usedCount)}/{faNum(c.maxUses)}
                      </span>
                    </td>
                    <td className="py-2.5 text-outline whitespace-nowrap">{c.expiresAt ? faDate(c.expiresAt) : "بدون انقضا"}</td>
                    <td className="py-2.5">
                      <div className="flex gap-1.5 justify-end flex-wrap">
                        <button
                          onClick={() => run(() => toggleDiscountCodeAction(c.id, !c.active), "کد تخفیف")}
                          className="px-2 py-1.5 rounded-lg bg-surface-container-high text-primary text-[10px] font-bold hover:bg-surface-container-highest transition whitespace-nowrap"
                        >
                          {c.active ? "غیرفعال" : "فعال"}
                        </button>
                        <button
                          onClick={() => run(() => resetCodeUsageAction(c.id), "کد تخفیف")}
                          className="px-2 py-1.5 rounded-lg bg-secondary/10 text-secondary text-[10px] font-bold hover:bg-secondary/20 transition whitespace-nowrap"
                          title="صفری‌سازی شمارش و دریافت‌ها"
                        >
                          صفر کردن
                        </button>
                        <button
                          onClick={() => run(() => deleteDiscountCodeAction(c.id), "کد تخفیف")}
                          className="px-2 py-1.5 rounded-lg bg-error-container/60 text-on-error-container text-[10px] font-bold hover:bg-error-container transition whitespace-nowrap"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent redemptions */}
      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
        <h2 className="font-headline-sm text-primary font-bold mb-3">آخرین دریافت‌های کاربران</h2>
        {discounts.redemptions.length === 0 ? (
          <p className="text-xs text-on-surface-variant py-4 text-center">هنوز کدی توسط کاربران دریافت نشده است.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {discounts.redemptions.map((r) => (
              <div key={r.id} className="flex items-center justify-between text-[11px] bg-surface-container-low rounded-xl p-2.5">
                <div>
                  <span className="font-bold text-primary font-mono" dir="ltr">{r.code}</span>
                  <span className="text-outline"> — {r.userName} ({r.userEmail})</span>
                  <p className="text-outline">{r.codeTitle}</p>
                </div>
                <span className="text-outline shrink-0">{faDate(r.createdAt)}</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1">
      <span className="flex items-center gap-1.5 text-xs text-on-surface-variant">
        <MSymbol name={icon} size={16} className="text-secondary" />
        {label}
      </span>
      <span className="text-headline-md font-black text-primary">{value}</span>
      {sub && <span className="text-[10px] text-outline">{sub}</span>}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10px] font-bold text-on-surface-variant">{label}</span>
      {children}
    </label>
  );
}
