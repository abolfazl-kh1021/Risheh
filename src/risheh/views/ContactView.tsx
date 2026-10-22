"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { sendContactMessageAction } from "@/lib/actions/public";

const SUBJECTS = [
  "مشاوره تخصصی خرید اثر و تزیینات اصیل",
  "هماهنگی بازدید حضوری از نگارخانه مرکزی",
  "استعلام و تایید اصالت شناسنامه اثر",
  "سفارش هدایای فاخر سازمانی و تقدیرنامه‌ها",
  "همکاری کارگاه‌ها و اساتید پیشکسوت",
  "انتقاد، پیشنهاد و صدای مشتریان",
];

const INFO_CARDS = [
  { icon: "support_agent", title: "مشاوره تلفنی و پشتیبانی", desc: "پاسخگویی به سوالات پیرامون مشخصات آثار، شناسنامه‌ها و روش‌های نگهداری.", value: "۰۲۱-۱۲۳۴۵۶۷۸", note: "پاسخگویی ۹ صبح تا ۹ شب همه روزه" },
  { icon: "storefront", title: "نشانی نگارخانه مرکزی", desc: "تهران، خ نجات‌اللهی (ویلا)، کوچه نوید، پلاک ۱۴، سرای صنایع دستی ریشه", value: "بازدید حضوری با هماهنگی", note: "پارکینگ اختصاصی مراجعین فعال است" },
  { icon: "mark_email_read", title: "مکاتبه رسمی و اصالت‌سنجی", desc: "ارسال تصاویر هولوگرام شناسنامه جهت استعلام و هماهنگی مکاتبات رسمی.", value: "salam@risheh-crafts.ir", note: "کانال پشتیبانی اختصاصی بله و ایتا" },
  { icon: "workspace_premium", title: "هدایای سازمانی و کارگاه‌ها", desc: "خط ویژه سفارش‌های انبوه سازمانی و ثبت‌نام اساتید قلم‌زنی، فرش و خاتم.", value: "داخلی ۲۰۴ و ۲۰۸", note: "ارائه پیش‌فاکتور رسمی و نمونه فیزیکی" },
];

const SCHEDULE = [
  { days: "شنبه تا چهارشنبه (بازدید عمومی و مشاوره)", hours: "۹:۰۰ صبح الی ۲۰:۳۰" },
  { days: "پنج‌شنبه‌ها (نگارخانه و سالن اختصاصی)", hours: "۹:۰۰ صبح الی ۱۷:۰۰" },
  { days: "جمعه‌ها و ایام سوگواری", hours: "فقط با هماهنگی پیشین کلکسیونرها" },
];

export function ContactView() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: SUBJECTS[0], message: "", callback: false });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async () => {
    setBusy(true);
    const res = await sendContactMessageAction({
      name: form.name,
      email: form.email || `${form.phone || "no-reply"}@risheh.ir`,
      subject: form.subject,
      message: form.message,
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
      toast({ title: "پیام ثبت شد", description: res.message });
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="pb-space-xl">
      {/* Hero */}
      <section className="bg-gradient-to-l from-primary-container via-[#0a332f] to-primary text-surface-bright">
        <div className="max-w-7xl mx-auto px-gutter py-space-lg">
          <div className="flex items-center gap-2 text-tertiary-fixed-dim text-xs font-bold mb-2">
            <MSymbol name="draw" size={16} />
            دروازه پیوند با گنجینه کهن
          </div>
          <h1 className="font-headline-xl !text-[24px] !leading-[40px] sm:!text-[30px] sm:!leading-[46px] font-extrabold mb-2">
            هم‌کلامی و مشاوره با کارشناسان نگارخانه ریشه
          </h1>
          <p className="text-sm text-on-primary-container max-w-3xl leading-relaxed">
            مشتاق شنیدن صدای شما هستیم؛ از مشاوره تخصصی خرید آثار و هدایای سازمانی تا استعلام اصالت و هماهنگی
            بازدید حضوری از نگارخانه مرکزی.
          </p>
          <div className="flex items-center gap-4 mt-3 text-[11px] text-on-primary-container flex-wrap">
            <span className="flex items-center gap-1">
              <MSymbol name="verified" size={14} className="text-tertiary-fixed-dim" />
              تضمین اصالت شناسنامه موزه
            </span>
            <span className="text-tertiary-fixed-dim">•</span>
            <span className="flex items-center gap-1">
              <MSymbol name="schedule" size={14} className="text-tertiary-fixed-dim" />
              پاسخگویی روزانه از ۹ الی ۲۱
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-gutter py-space-lg grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* Info cards */}
        <aside className="flex flex-col gap-3">
          {INFO_CARDS.map((c) => (
            <div key={c.title} className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center shrink-0">
                  <MSymbol name={c.icon} size={20} />
                </div>
                <h3 className="text-sm font-bold text-primary">{c.title}</h3>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mt-1.5">{c.desc}</p>
              <p className="text-sm font-black text-secondary mt-1" dir="auto">
                {c.value}
              </p>
              <p className="text-[10px] text-outline">{c.note}</p>
            </div>
          ))}

          {/* Schedule */}
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
            <h3 className="text-sm font-bold text-primary flex items-center gap-2 mb-3">
              <MSymbol name="timelapse" className="text-secondary" size={18} />
              زمان‌بندی پذیرش و میزبانی
            </h3>
            <div className="flex flex-col gap-2">
              {SCHEDULE.map((s) => (
                <div key={s.days} className="flex items-center justify-between text-[11px]">
                  <span className="text-on-surface-variant">{s.days}</span>
                  <span className="font-bold text-on-tertiary-container shrink-0">{s.hours}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 bg-tertiary-fixed/40 text-on-tertiary-fixed-variant rounded-xl p-2.5 text-[11px] flex items-start gap-1.5">
              <MSymbol name="lightbulb" size={14} className="shrink-0 mt-0.5" />
              برای خریدهای بالای ۵۰ میلیون تومان، امکان اعزام کارشناس به همراه ۲ اثر برای آزمون در چیدمان منزل
              مقدور است.
            </div>
          </div>
        </aside>

        {/* Form */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-5">
            <h2 className="font-headline-md text-primary font-bold flex items-center gap-2 mb-1">
              <MSymbol name="history_edu" className="text-secondary" />
              فرم مشاوره تخصصی — ثبت پیام و تقاضای کارشناسی اثر
            </h2>
            <p className="text-xs text-on-surface-variant mb-4 leading-relaxed">
              جهت استعلام اصالت، رزرو ساعت بازدید از گالری وی‌آی‌پی، یا هماهنگی کاتالوگ سازمانی، جزئیات ذیل را
              درج فرمایید. کارشناسان ما ظرف کمتر از ۴ ساعت کاری با شما پیوند خواهند گرفت.
            </p>

            {done ? (
              <div className="bg-secondary/10 border border-secondary/40 rounded-2xl p-5 text-center">
                <MSymbol name="task_alt" size={36} className="text-secondary" />
                <p className="font-headline-sm text-primary font-bold mt-2">پیام شما با موفقیت ثبت شد</p>
                <p className="text-xs text-on-surface-variant mt-1">
                  شماره پیگیری شما: RSH-۸۸۴۲ | کارشناسان ما به‌زودی با شماره اعلامی تماس خواهند گرفت.
                </p>
                <button
                  onClick={() => {
                    setDone(false);
                    setForm({ name: "", phone: "", email: "", subject: SUBJECTS[0], message: "", callback: false });
                  }}
                  className="mt-3 bg-primary text-on-primary rounded-xl px-4 py-2 text-xs font-bold hover:bg-primary-container transition"
                >
                  ثبت پیام جدید
                </button>
              </div>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void submit();
                }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">نام و نام خانوادگی <span className="text-error">*</span></span>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">شماره تلفن همراه <span className="text-error">*</span></span>
                  <input
                    required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="09123456789"
                    dir="ltr"
                    className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">رایانامه (اختیاری)</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    dir="ltr"
                    className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm text-left border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </label>
                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">موضوع ارتباط <span className="text-error">*</span></span>
                  <select
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
                  >
                    {SUBJECTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="sm:col-span-2 flex flex-col gap-1.5">
                  <span className="text-[11px] font-bold text-on-surface-variant">شرح درخواست یا پیام شما <span className="text-error">*</span></span>
                  <textarea
                    required
                    rows={5}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="bg-surface-container-low rounded-xl px-3 py-2.5 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                  />
                </label>
                <label className="sm:col-span-2 flex items-start gap-2 text-[11px] text-on-surface-variant">
                  <input
                    type="checkbox"
                    checked={form.callback}
                    onChange={(e) => setForm({ ...form, callback: e.target.checked })}
                    className="mt-0.5 accent-[#186969]"
                  />
                  مایلم مشاور ارشد فرش، خاتم و میناکاری ریشه جهت ارزیابی ابعاد و هماهنگی حضوری مستقیماً با بنده
                  تماس حاصل فرماید.
                </label>
                <div className="sm:col-span-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                  <button
                    type="submit"
                    disabled={busy}
                    className="px-space-xl py-3 rounded-xl bg-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 shadow-md hover:bg-primary-container transition-colors disabled:opacity-60"
                  >
                    <MSymbol name="send" size={18} />
                    {busy ? "در حال ارسال…" : "ارسال درخواست مشاوره"}
                  </button>
                  <span className="text-[10px] text-outline flex items-center gap-1">
                    <MSymbol name="lock" size={12} />
                    اطلاعات تماس شما نزد نگارخانه ریشه محرمانه خواهد ماند.
                  </span>
                </div>
              </form>
            )}
          </section>

          {/* VIP room */}
          <section className="rounded-2xl elevation-1 overflow-hidden bg-surface-container-lowest">
            <div className="relative h-48">
              { }
              <img
                src="/assets/img/img_88655654fea3.webp"
                alt="نمای بخشی از تالار شاهکارهای قلم‌زنی و مینا"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container/80 via-transparent" />
              <div className="absolute bottom-3 right-4 text-surface-bright">
                <p className="text-sm font-bold flex items-center gap-1.5">
                  <MSymbol name="assured_workload" size={18} className="text-tertiary-fixed-dim" />
                  اتاق اختصاصی ارزیابی و کلکسیونرها
                </p>
                <p className="text-[10px] text-on-primary-container mt-0.5">
                  مدیر ارزیابی: استاد محمدرضا فخار | اصفهان ✦ تهران
                </p>
              </div>
            </div>
            <div className="p-4">
              <p className="text-xs text-on-surface-variant leading-relaxed">
                در نگارخانه مرکزی ریشه، سالنی مجزا با عنوان «سرای گنجینه» برای بررسی میکروسکوپی گره‌های فرش
                ابریشم، بررسی عیار نقره‌کوبی و رویت مهر اساتید در آرامش کامل مهیاست.
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
