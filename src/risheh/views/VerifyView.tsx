"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDate, LAB_STATUS_FA } from "@/lib/fa";
import { verifyAuthenticityAction, type VerifyResult } from "@/lib/actions/public";

const SAMPLE_TIMELINE = [
  { date: "پاییز ۱۴۰۰", title: "ریسندگی ابریشم", desc: "استحصال پیله‌های مرغوب و دست‌ریس الیاف خالص در کارگاه سنتی حومه شیراز." },
  { date: "زمستان ۱۴۰۰", title: "رنگرزی ارگانیک", desc: "عمل‌آوری در پاتیل‌های مسین با جوهر گیاهی روناس، پوست گردو و برگ مو." },
  { date: "بهار - پاییز ۱۴۰۱", title: "چله‌کشی و بافت", desc: "۳۶۰ روز بافت بی‌وقفه با گره ترکی متقارن بر دار ارگونومیک چوبی." },
  { date: "دی ۱۴۰۱", title: "پرداخت و شویش", desc: "لبه‌دوزی چرمی، شیرازه‌پیچی ابریشمی و شستشوی سنتی با عصاره چوبک." },
  { date: "بهمن ۱۴۰۲", title: "پلاک‌گذاری ریشه", desc: "تایید نهایی آزمایشگاهی و نصب پلاک فلزی با شناسه یکتا." },
];

const SECURITY_GUIDE = [
  { icon: "badge", title: "میکروپرینت پلاک برنجی", desc: "پلاک برنجی متصل به پشت اثر با لیزر نانو حکاکی شده و کلمه «RISHEH CRAFTS» با ذره‌بین در حاشیه شماره سریال خوانا است." },
  { icon: "qr_code_2", title: "بارکد رمزنگاری‌شده ECC", desc: "کد دوبعدی روی پلاک با اسکن از طریق دوربین، مستقیماً به همین نشانی معتبر در سرور امنیتی ریشه متصل می‌گردد." },
  { icon: "security", title: "نخ امنیتی در بافت شناسنامه", desc: "شناسنامه فیزیکی روی کاغذ پنبه‌ای زرافشان چاپ شده و در برابر نور ماوراءبنفش، تارهای طلایی درخشان هویدا می‌شود." },
];

export function VerifyView() {
  const { toast } = useToast();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<Extract<VerifyResult, { ok: true }> | null>(null);
  const [searched, setSearched] = useState(false);

  const doVerify = async (value?: string) => {
    const target = (value ?? code).trim();
    setBusy(true);
    const res = await verifyAuthenticityAction(target);
    setBusy(false);
    setSearched(true);
    if (res.ok) {
      setResult(res);
      if (value) setCode(value);
    } else {
      toast({ title: "خطا در استعلام", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="pb-space-xl">
      {/* ===== Header band ===== */}
      <section className="bg-gradient-to-l from-primary-container via-[#0a332f] to-primary text-surface-bright">
        <div className="max-w-7xl mx-auto px-gutter py-space-lg">
          <div className="flex items-center gap-2 text-tertiary-fixed-dim text-xs font-bold mb-2">
            <MSymbol name="verified" size={16} />
            سامانه استعلام شناسنامه اصالت ریشه
            <span className="text-on-primary-container">✦</span>
            <span className="text-on-primary-container font-medium">حالت نمایشی — رکورد داخلی سامانه</span>
          </div>
          <h1 className="font-headline-xl !text-[24px] !leading-[40px] sm:!text-[30px] sm:!leading-[46px] font-extrabold mb-2">
            استعلام برخط شناسنامه اصالت و ردگیری تبار اثر
          </h1>
          <p className="text-sm text-on-primary-container max-w-3xl leading-relaxed">
            آثار منتشرشده ریشه شناسنامه‌ای با کد یکتا در پایگاه‌داده همین سامانه دارند؛ کد را وارد کنید و وضعیت
            ثبت‌شده آن را ببینید. این استعلام جست‌وجو در رکوردهای داخلی ریشه است، نه گواهی یک آزمایشگاه یا مرجع
            مستقل بیرونی.
          </p>
        </div>
      </section>

      {/* ===== Search ===== */}
      <section className="max-w-3xl mx-auto px-gutter -mt-6">
        <div className="bg-surface-container-lowest rounded-2xl elevation-2 p-4 border border-outline-variant/40">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && doVerify()}
                placeholder="کد شناسه یا کد هولوگرام را وارد کنید (مثال: RSH-9834)"
                aria-label="کد استعلام"
                dir="ltr"
                className="w-full bg-surface-container-low rounded-xl py-3 px-4 pl-11 text-sm text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <MSymbol
                name="fingerprint"
                size={22}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
            </div>
            <button
              onClick={() => doVerify()}
              disabled={busy}
              className="flex items-center justify-center gap-2 bg-primary-container text-surface-bright px-space-lg py-3 rounded-xl text-sm font-bold hover:bg-secondary transition-all shadow-md active:scale-95 shrink-0 disabled:opacity-60"
            >
              <MSymbol name="policy" size={18} />
              {busy ? "در حال استعلام…" : "استعلام و صدور کارنامه"}
            </button>
            <button
              onClick={() =>
                toast({
                  title: "اسکن QR",
                  description: "دسترسی به دوربین در این محیط نمایشی فراهم نیست؛ لطفاً کد را دستی وارد کنید.",
                })
              }
              className="bg-surface-container-high text-primary hover:bg-surface-variant p-3 rounded-xl flex items-center justify-center transition-colors shrink-0"
              title="اسکن کد QR پلاک فلزی"
              aria-label="اسکن کد QR"
            >
              <MSymbol name="qr_code_scanner" size={20} />
            </button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1.5 mt-3 text-[11px] text-outline">
            <span className="flex items-center gap-1">
              <MSymbol name="storage" size={13} />
              منبع نتیجه: رکوردهای ثبت‌شده در پایگاه‌داده ریشه
            </span>
            <span className="flex items-center gap-1">
              <MSymbol name="history_edu" size={13} />
              نتیجه به‌روز بودن رکورد را تضمین می‌کند، نه اصالت فیزیکی اثر را
            </span>
          </div>
        </div>
      </section>

      {/* ===== Result ===== */}
      {searched && result && (
        <section className="max-w-3xl mx-auto px-gutter mt-space-lg">
          {/* Honest-scope notice (M10): this is a DB lookup, not an external lab certificate */}
          <div className="mb-4 rounded-2xl bg-tertiary-fixed/30 border border-tertiary-fixed-dim/60 p-3 flex items-start gap-2 text-[11px] text-on-tertiary-fixed-variant leading-relaxed">
            <MSymbol name="info" size={16} className="shrink-0 mt-0.5" />
            <span>
              این صفحه صرفاً وضعیت شناسنامه‌های ثبت‌شده توسط مدیریت ریشه در پایگاه‌داده همین وب‌سایت را نمایش
              می‌دهد. این نتیجه گواهی آزمایشگاه مستقل، مرجع دولتی یا اتحادیه نیست و جایگزین کارشناسی حضوری اثر
              نمی‌شود. (حالت نمایشی پروژه)
            </span>
          </div>
          {result.state === "VERIFIED" && (
            <div className="flex flex-col gap-4">
              {/* Certificate */}
              <div className="rounded-3xl overflow-hidden elevation-2 bg-surface-container-lowest border-2 border-tertiary-fixed-dim">
                <div className="bg-tertiary-fixed/40 px-5 py-3 flex items-center justify-between border-b border-tertiary-fixed-dim/50">
                  <div className="flex items-center gap-2 text-on-tertiary-fixed-variant">
                    <MSymbol name="spa" size={20} />
                    <span className="text-xs font-bold tracking-wide">RISHEH ARTISAN VERIFICATION ARCHIVE — DEMO</span>
                  </div>
                  <span className="text-xs font-black text-on-tertiary-container">
                    شناسنامه اصالت ثبت‌شده در سامانه ریشه
                  </span>
                </div>
                <div className="p-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <CertField icon="tag" label="شناسه یکتا و کد رهگیری" value={result.code ?? ""} />
                    <CertField icon="stars" label="پلاک هولوگرام زرین" value={result.hologramCode ?? ""} />
                    <CertField icon="history_edu" label="پدیدآورنده و استادکار" value={result.sellerName ?? ""} />
                    <CertField icon="interests" label="عنوان و موضوع اثر" value={result.title ?? ""} />
                    <CertField icon="location_on" label="خاستگاه جغرافیایی" value={result.province ?? "—"} />
                    <CertField
                      icon="calendar_today"
                      label="تاریخ صدور شناسنامه"
                      value={result.issuedAt ? faDate(result.issuedAt) : "—"}
                    />
                  </div>
                  <div className="mt-4 rounded-2xl bg-secondary/5 border border-secondary/30 p-4 flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full bg-secondary/15 border-2 border-secondary text-secondary flex items-center justify-center rotate-[-8deg] shrink-0">
                      <div className="text-center leading-none">
                        <MSymbol name="verified" size={18} />
                        <p className="text-[8px] font-black mt-0.5">RISHEH LAB</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-black text-secondary">تایید اصالت (بر اساس رکورد داخلی)</p>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed mt-0.5">
                        {result.message}
                      </p>
                    </div>
                    <span className="mr-auto text-[10px] font-black text-secondary/70 hidden md:block">VERIFIED RECORD</span>
                  </div>
                </div>
              </div>

              {/* Lab report */}
              <div className="rounded-2xl elevation-1 bg-surface-container-lowest p-5 border border-outline-variant/40">
                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                  <h3 className="font-headline-md text-primary font-bold flex items-center gap-2">
                    <MSymbol name="biotech" className="text-secondary" />
                    کارنامه ثبت‌شده اثر در سامانه ریشه
                  </h3>
                  <span className="text-xs font-bold text-secondary bg-secondary/10 rounded-full px-3 py-1">
                    وضعیت آزمایشگاه (نمایشی): {LAB_STATUS_FA[result.labStatus ?? "ISSUED"] ?? result.labStatus}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {result.tests?.map((t, i) => (
                    <div key={i} className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/30">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5">
                        <MSymbol name="check_circle" size={15} className="text-secondary" />
                        {t.name}
                      </p>
                      <p className="text-[11px] text-on-surface-variant mt-1.5 leading-relaxed">{t.detail}</p>
                      <p className="text-[10px] font-bold text-on-tertiary-container mt-1.5">
                        نتیجه: {t.result}
                      </p>
                    </div>
                  ))}
                </div>
                {result.notes && (
                  <p className="text-[11px] text-outline mt-3 border-t border-outline-variant/30 pt-2">
                    {result.notes}
                  </p>
                )}
              </div>

              {/* Timeline (illustrative sample, not per-artwork data) */}
              <div className="rounded-2xl elevation-1 bg-surface-container-lowest p-5 border border-outline-variant/40">
                <h3 className="font-headline-md text-primary font-bold flex items-center gap-2 mb-1">
                  <MSymbol name="timeline" className="text-secondary" />
                  گاه‌شمار نمونه خلق یک اثر (نمایشی)
                </h3>
                <p className="text-[11px] text-outline mb-4">
                  این گاه‌شمار صرفاً یک نمونه نمایشی ثابت برای آشنایی با فرایند است و سابقه ثبت‌شده همین اثر
                  نیست.
                </p>
                <ol className="relative border-r-2 border-tertiary-fixed-dim/60 mr-3 flex flex-col gap-4">
                  {SAMPLE_TIMELINE.map((t, i) => (
                    <li key={i} className="relative mr-4 pr-4">
                      <span className="absolute -right-[22px] top-0 w-5 h-5 rounded-full bg-tertiary-fixed-dim text-tertiary-container text-[10px] font-black flex items-center justify-center">
                        {i + 1}
                      </span>
                      <p className="text-xs font-bold text-on-tertiary-container">{t.date}</p>
                      <p className="text-sm font-bold text-primary mt-0.5">{t.title}</p>
                      <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">{t.desc}</p>
                    </li>
                  ))}
                </ol>
              </div>

              {/* Security guide — planned physical-plate concept, clearly demo */}
              <div className="rounded-2xl elevation-1 bg-surface-container-lowest p-5 border border-outline-variant/40">
                <h3 className="font-headline-md text-primary font-bold flex items-center gap-2 mb-1">
                  <MSymbol name="lock" className="text-secondary" />
                  طرح پلاک فیزیکی شناسنامه (ایده نمایشی)
                </h3>
                <p className="text-[11px] text-outline mb-3">
                  موارد زیر توصیف طراحیِ پیشنهادی برای پلاک فیزیکی در نسخه‌های آتی است و در نسخه فعلی وب‌سایت
                  پیاده‌سازی فیزیکی ندارد.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {SECURITY_GUIDE.map((s) => (
                    <div key={s.title} className="rounded-xl bg-surface-container-low p-3 border border-outline-variant/30">
                      <p className="text-xs font-bold text-primary flex items-center gap-1.5 mb-1">
                        <MSymbol name={s.icon} size={15} className="text-secondary" />
                        {s.title}
                      </p>
                      <p className="text-[11px] text-on-surface-variant leading-relaxed">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {result.state === "PENDING" && (
            <div className="rounded-2xl elevation-1 bg-tertiary-fixed/30 border border-tertiary-fixed-dim p-6 text-center">
              <MSymbol name="hourglass_top" size={40} className="text-on-tertiary-fixed-variant" />
              <p className="font-headline-sm text-on-tertiary-fixed-variant font-bold mt-2">
                این اثر در فرایند تایید اصالت است
              </p>
              {result.title && <p className="text-sm text-on-tertiary-fixed-variant mt-1">{result.title}</p>}
              {result.code && <p className="text-xs font-bold text-on-tertiary-fixed-variant mt-1">کد اثر: {result.code}</p>}
              <p className="text-xs text-on-tertiary-fixed-variant mt-3 leading-relaxed max-w-md mx-auto">
                {result.message} وضعیت آزمایشگاه: {LAB_STATUS_FA[result.labStatus ?? "QUEUED"] ?? result.labStatus}
              </p>
            </div>
          )}

          {result.state === "NOT_FOUND" && (
            <div className="rounded-2xl elevation-1 bg-error-container/40 border border-error/40 p-6 text-center">
              <MSymbol name="search_off" size={40} className="text-on-error-container" />
              <p className="font-headline-sm text-on-error-container font-bold mt-2">
                شناسنامه‌ای با این کد یافت نشد
              </p>
              <p className="text-xs text-on-error-container mt-3 leading-relaxed max-w-lg mx-auto">
                {result.message}
              </p>
              <button
                onClick={() => doVerify("RSH-9834")}
                className="mt-4 bg-surface-bright text-primary rounded-xl px-4 py-2 text-xs font-bold hover:bg-surface-container-high transition"
              >
                استعلام با کد نمونه معتبر (RSH-9834)
              </button>
            </div>
          )}
        </section>
      )}

      {!searched && (
        <section className="max-w-3xl mx-auto px-gutter mt-space-lg">
          <div className="rounded-2xl bg-surface-container-lowest elevation-1 p-5 border border-outline-variant/40">
            <h3 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-2">
              <MSymbol name="info" className="text-secondary" />
              راهنمای استعلام
            </h3>
            <ul className="text-xs text-on-surface-variant leading-relaxed flex flex-col gap-1.5 list-disc pr-5">
              <li>نتیجه استعلام از رکوردهای ثبت‌شده در پایگاه‌داده ریشه خوانده می‌شود؛ نه از آزمایشگاه یا مرجع بیرونی.</li>
              <li>نتیجه «یافت نشد» به معنای تقلبی بودن اثر نیست؛ اثر ممکن است در زنجیره تایید ریشه ثبت نشده باشد.</li>
              <li>برای بررسی حضوری و مطالبه اصالت با پشتیبانی ریشه تماس بگیرید: ۰۲۱-۱۲۳۴۵۶۷۸</li>
            </ul>
          </div>
        </section>
      )}
    </div>
  );
}

function CertField({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 bg-surface-container-low rounded-xl p-3 border border-outline-variant/30">
      <MSymbol name={icon} size={18} className="text-on-tertiary-container shrink-0 mt-0.5" />
      <div>
        <p className="text-[10px] text-outline">{label}</p>
        <p className="text-xs font-bold text-primary mt-0.5" dir="auto">
          {value}
        </p>
      </div>
    </div>
  );
}
