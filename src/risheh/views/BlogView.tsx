"use client";

import { useState } from "react";
import { MSymbol } from "@/components/icons";
import { faDate, faNum } from "@/lib/fa";
import type { AppData, BlogPostDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

type Props = { data: AppData; navigate: (to: string) => void };

const TRENDING = [
  { cat: "دستبافته‌های ترکمن", title: "نمادشناسی نقوش «ماری‌گل» و فلسفه پرواز عقاب در گلیم صحرا", views: "۴,۲۸۰ خوانش" },
  { cat: "سرامیک لالجین همدان", title: "راز لعاب‌های قلیایی هفت‌رنگ و فرمول پنهان خاندان شفیعی", views: "۳,۸۱۰ خوانش" },
  { cat: "ترمه‌بافی یزد", title: "تفاوت ابریشم طبیعی با ویسکوز مصنوعی در رومیزی‌های سنتی", views: "۲,۹۵۰ خوانش" },
  { cat: "نگارگری و تذهیب", title: "طلاگذاری بر مقوای دست‌ساز؛ آموزش ظرایف قلم‌موی گربه ایرانی", views: "۲,۴۳۰ خوانش" },
];

const GLOSSARY = [
  { field: "فرش‌شناسی", n: "۱", term: "رج‌شمار", desc: "تعداد گره‌های بافته‌شده در هر ۷ سانتی‌متر (یک گره ذرعی) در قالی آذربایجان. هرچه رج‌شمار بالاتر (مثلاً ۶۰ یا ۷۰)، بافت فرش ظریف‌تر و ریزتر است." },
  { field: "طراحی سنتی", n: "۲", term: "تُرَنج", desc: "نقش بیضی یا گرد مرکزی در قالی، تذهیب و جلدسازی که نماد خورشید، چشم‌انداز افلاک و سرچشمه نور در هندسه عرفانی ایران به شمار می‌آید." },
  { field: "میناکاری", n: "۳", term: "خانه‌بندی", desc: "تکنیک باستانی لحیم کردن مفتول‌های سیمین یا زرین روی زمینه مس و ریختن لعاب رنگی در خانه‌ها؛ روشی نفیس که مقاومتی مادام‌العمر به لعاب می‌بخشد." },
  { field: "خوشنویسی و مهر", n: "۴", term: "طُغرا", desc: "ترسیم پیچیده و هندسی نام پادشاه، خوشنویس یا صاحب اثر در خطوط موازی و منحنی‌های شاهانه که به‌عنوان امضای شناسنامه روی فلزات و اسناد حک می‌شد." },
  { field: "قلم‌زنی", n: "۵", term: "سیاه‌قلم", desc: "پر کردن شیارهای کنده‌کاری‌شده نقره یا برنج با ملغمه‌ای از دوده و روغن یا قیر برای برجسته کردن خطوط حکاکی و ایجاد کنتراست عمیق سایه‌روشن." },
];

export function BlogView({ data }: Props) {
  const [selected, setSelected] = useState<BlogPostDTO | null>(null);
  const [category, setCategory] = useState<string>("همه");

  const featured = data.posts.find((p) => p.featured);
  const categories = ["همه", ...Array.from(new Set(data.posts.map((p) => p.category ?? "عمومی")))];
  const posts = category === "همه" ? data.posts.filter((p) => p !== featured) : data.posts.filter((p) => (p.category ?? "عمومی") === category);

  if (selected) {
    return (
      <article className="max-w-4xl mx-auto px-gutter py-space-lg pb-space-xl">
        <button
          onClick={() => setSelected(null)}
          className="flex items-center gap-1 text-sm font-bold text-secondary hover:text-primary transition mb-4"
        >
          <MSymbol name="arrow_forward" size={18} />
          بازگشت به فهرست جستارها
        </button>
        <div className="flex items-center gap-2 text-xs font-bold text-on-tertiary-container mb-2">
          <span className="bg-tertiary-fixed/60 rounded-full px-3 py-1">{selected.category}</span>
          <span className="text-outline">{faDate(selected.createdAt)}</span>
          <span className="text-outline">•</span>
          <span className="text-outline">{faNum(selected.readTime)} دقیقه مطالعه</span>
        </div>
        <h1 className="font-headline-xl !text-[24px] !leading-[40px] sm:!text-[30px] sm:!leading-[48px] text-primary font-extrabold leading-tight mb-4">
          {selected.title}
        </h1>
        {selected.image && (
          <div className="rounded-2xl overflow-hidden elevation-1 mb-5">
            { }
            <img src={selected.image} alt={selected.title} className="w-full aspect-[16/8] object-cover" />
          </div>
        )}
        <p className="text-body-lg leading-relaxed text-on-surface-variant border-r-4 border-tertiary-fixed-dim pr-4 mb-5">
          {selected.excerpt}
        </p>
        <div className="text-body-lg leading-[1.9] text-on-surface whitespace-pre-line text-justify">
          {selected.content}
        </div>
        <div className="mt-6 pt-4 border-t border-outline-variant/40 flex items-center justify-between text-xs text-outline">
          <span className="font-bold text-primary">{selected.author}</span>
          <span>مجله هنری ریشه ✦ دانشنامه، روایات و مقالات هنر کهن</span>
        </div>
      </article>
    );
  }

  return (
    <div className="pb-space-xl">
      {/* Header band */}
      <section className="bg-primary-container text-surface-bright">
        <div className="max-w-7xl mx-auto px-gutter py-space-lg">
          <div className="flex items-center gap-2 text-tertiary-fixed-dim text-xs font-bold mb-2">
            <MSymbol name="qr_code_2" size={16} />
            ریشه؛ پلی میان هنر اصیل ایرانی و زندگی مدرن
          </div>
          <h1 className="font-headline-lg font-extrabold mb-1">دانشنامه، روایات و مقالات هنر کهن</h1>
          <div className="flex items-center gap-2 text-xs text-on-primary-container mt-2 flex-wrap">
            <span className="flex items-center gap-1">
              <MSymbol name="auto_stories" size={15} />
              بیش از ۱۲۰ مقاله پژوهشی و مستند
            </span>
            <span className="text-tertiary-fixed-dim">•</span>
            <span className="flex items-center gap-1">
              <MSymbol name="verified" size={15} />
              تأییدیه علمی پژوهشکده صنایع دستی
            </span>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-gutter py-space-lg grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        <div className="lg:col-span-2 flex flex-col gap-space-lg">
          {/* Featured */}
          {featured && (
            <button
              onClick={() => setSelected(featured)}
              className="text-right bg-surface-container-lowest rounded-3xl elevation-1 overflow-hidden group"
            >
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative aspect-[16/10] md:aspect-auto overflow-hidden">
                  { }
                  <img
                    src={featured.image ?? ""}
                    alt={featured.title}
                    className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                  />
                  <span className="absolute top-3 right-3 bg-pomegranate text-white text-[10px] font-bold rounded-full px-2.5 py-1">
                    پرونده اختصاصی
                  </span>
                </div>
                <div className="p-5 flex flex-col gap-2">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-on-tertiary-container">
                    <span className="bg-tertiary-fixed/60 rounded-full px-2.5 py-1">روایت ویژه سردبیر ✦ دانشنامه فرش دستباف</span>
                  </div>
                  <h2 className="font-headline-md text-primary font-bold leading-snug group-hover:text-secondary transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-3">{featured.excerpt}</p>
                  <div className="flex items-center gap-2 text-[10px] text-outline mt-auto pt-2">
                    <span>{featured.category}</span>
                    <span>•</span>
                    <span>{faNum(featured.readTime)} دقیقه مطالعه</span>
                    <span>•</span>
                    <span>{featured.author}</span>
                  </div>
                  <span className="inline-flex items-center gap-2 self-start bg-primary-container text-surface-bright px-4 py-2 rounded-xl text-xs font-bold shadow-md">
                    مطالعه جستار کامل
                    <MSymbol name="arrow_back" size={14} />
                  </span>
                </div>
              </div>
            </button>
          )}

          {/* Category filter */}
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-4 py-2 text-xs font-bold transition-colors flex items-center gap-1",
                  category === c
                    ? "bg-primary-container text-surface-bright shadow-sm"
                    : "bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-primary"
                )}
              >
                {c === "همه" && `همه مقالات ${faNum(data.posts.length)}`}
                {c !== "همه" && c}
              </button>
            ))}
          </div>

          {/* Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {posts.map((p) => (
              <article
                key={p.id}
                onClick={() => setSelected(p)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelected(p);
                  }
                }}
                className="cursor-pointer text-right bg-surface-container-lowest rounded-2xl elevation-1 overflow-hidden group flex flex-col"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  { }
                  <img
                    src={p.image ?? ""}
                    alt={p.title}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
                  />
                  <button
                    aria-label="افزودن به علاقه‌مندی‌ها"
                    className="absolute top-2 left-2 w-8 h-8 rounded-full bg-surface-bright/80 backdrop-blur-md flex items-center justify-center text-on-surface-variant hover:text-error transition-colors"
                  >
                    <MSymbol name="favorite" size={15} />
                  </button>
                </div>
                <div className="p-4 flex flex-col gap-1.5 flex-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-outline">
                    <span className="font-bold text-on-tertiary-container">{p.category}</span>
                    <span>•</span>
                    <span>{faDate(p.createdAt)}</span>
                    <span>•</span>
                    <span>{faNum(p.readTime)} دقیقه</span>
                  </div>
                  <h3 className="font-headline-sm text-primary font-bold leading-snug group-hover:text-secondary transition-colors line-clamp-2">
                    {p.title}
                  </h3>
                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2">{p.excerpt}</p>
                  <span className="text-[11px] font-bold text-on-tertiary-container flex items-center gap-1 mt-auto pt-1">
                    ادامه مطلب
                    <MSymbol name="chevron_left" size={13} />
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside className="flex flex-col gap-4">
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
            <h3 className="font-headline-sm text-primary font-bold flex items-center gap-2 mb-3">
              <MSymbol name="trending_up" className="text-error" />
              پربازدیدترین جستارها — هفته جاری
            </h3>
            <div className="flex flex-col gap-3">
              {TRENDING.map((t, i) => (
                <div key={i} className="flex items-start gap-3 group">
                  <span className="text-headline-sm font-black text-tertiary-fixed-dim">{faNum(i + 1).padStart(2, "۰")}</span>
                  <div>
                    <p className="text-[11px] font-bold text-on-tertiary-container">{t.cat}</p>
                    <p className="text-xs font-bold text-primary leading-snug group-hover:text-secondary transition-colors">{t.title}</p>
                    <p className="text-[10px] text-outline mt-0.5">{t.views}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary bg-secondary/10 rounded-full px-2 py-1">
                <MSymbol name="verified" size={12} />
                چهره ماندگار صنایع دستی ماه
              </span>
            </div>
            <div className="aspect-square rounded-xl overflow-hidden bg-surface-container mb-2">
              { }
              <img src="/assets/img/img_f13f06871f30.webp" alt="استاد رسول معتمدی" loading="lazy" className="w-full h-full object-cover" />
            </div>
            <p className="text-sm font-bold text-primary">استاد رسول معتمدی</p>
            <p className="text-[11px] text-on-surface-variant">دارنده نشان درجه‌یک هنری (قلم‌زنی مس)</p>
            <p className="text-[11px] text-outline">زادگاه: اصفهان، پل خواجو</p>
            <p className="text-xs text-on-tertiary-container bg-tertiary-fixed/40 rounded-xl p-2.5 mt-2 leading-relaxed">
              «هنر قلم‌زنی گوش دادن به نغمه فلز است؛ اگر با عشق بر مس نکوبی، مس به تو آواز نخواهد داد.»
            </p>
          </div>

          <div className="bg-primary-container text-surface-bright rounded-2xl p-4">
            <h3 className="font-headline-sm font-bold">جامعه فرهیختگان ریشه</h3>
            <p className="text-[11px] text-on-primary-container mt-1 leading-relaxed">
              هر پنج‌شنبه، یک جستار نفیس درباره تاریخ هنر ایران به رایانامه شما ارسال می‌شود. بدون تبلیغات زاید.
            </p>
            <p className="text-[10px] text-tertiary-fixed-dim mt-2">بیش از ۱۸,۰۰۰ هنردوست مشترک هفته‌نامه هستند.</p>
          </div>
        </aside>
      </div>

      {/* Glossary */}
      <section className="max-w-7xl mx-auto px-gutter pb-space-lg">
        <div className="text-center mb-4">
          <div className="ornament-line mb-2">
            <span className="text-xs font-bold text-on-tertiary-container">✦ واژه‌نامه تخصصی اصالت و هویت</span>
          </div>
          <h2 className="font-headline-lg text-primary font-extrabold">دانشنامه واژگان و اصطلاحات اصیل صنایع دستی</h2>
          <p className="text-sm text-on-surface-variant mt-2">
            کلیدواژه‌هایی که هر کلکسیونر و شیفته میراث فرهنگی ایران‌زمین باید با عمق و معنای فنی آن‌ها آشنا باشد.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
          {GLOSSARY.map((g) => (
            <div key={g.term} className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-on-tertiary-container">{g.field}</span>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-tertiary-fixed text-tertiary-container text-[11px] font-black flex items-center justify-center shrink-0">
                  {g.n}
                </span>
                <h3 className="font-headline-sm text-primary font-bold">{g.term}</h3>
              </div>
              <p className="text-[11px] text-on-surface-variant leading-relaxed">{g.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
