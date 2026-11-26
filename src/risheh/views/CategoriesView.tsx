"use client";

import { useMemo, useState } from "react";
import { MSymbol } from "@/components/icons";
import { ProductCard } from "@/components/storefront/ProductCard";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { faNum } from "@/lib/fa";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotFoundView } from "@/risheh/views/NotFoundView";

type Shared = {
  data: AppData;
  navigate: (to: string) => void;
  onAddToCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isFav: (id: string) => boolean;
  route: { view: string; param?: string; query: URLSearchParams };
};

const HERO_COPY: Record<string, { kicker: string; tag: string; title: string; desc: string; stat1: string; stat1v: string; stat2: string; stat2v: string }> = {
  all: {
    kicker: "گنجینه هنر و صنایع دستی اصیل ایران",
    tag: "شناسنامه رسمی اصالت",
    title: "همه دست‌سازه‌های اصیل استادکاران ایران",
    desc: "مجموعه‌ای گزیده از شاهکارهای تأییدشده آزمایشگاه اصالت ریشه؛ از فرش و گلیم عشایری تا میناکاری اصفهان و نگارگری کهن.",
    stat1: "اثر با شناسنامه فعال",
    stat2: "دسته‌بندی تخصصی",
  },
  carpet: {
    kicker: "مجموعه نفایس تار و پود ایران",
    tag: "شناسنامه رسمی گره‌به‌گره",
    title: "گنجینه فرش، گلیم و زیراندازهای دستباف کهن",
    desc: "رقص سرانگشتان عشایر و نگارخانه‌های زرین تبریز، کاشان، نائین و بیجار. بافته‌شده با پشم دست‌ریس، ابریشم طبیعی و عصاره رنگرزی روناس، نیل و پوست انار.",
    stat1: "اثر موزه‌ای آماده ارسال",
    stat2: "تنوع رج‌شمار تخصصی",
  },
  metal: {
    kicker: "نقش و آتش بر سنگ فلز",
    tag: "مینای ۸۰۰ درجه",
    title: "میناکاری اصفهان و قلم‌زنی اصیل؛ تجسد شکوه فلز در کوره ۸۰۰ درجه",
    desc: "نگارگری چندلایه لعاب کوارتز بر مس خالص ۹۹٪ و ضربه‌های حساب‌شده قلم فولادی بر نقره و برنج؛ از کارگاه‌های میدان نقش‌جهان.",
    stat1: "اثر امضادار استادکاران",
    stat2: "لعاب نسوز کوارتز",
  },
  pottery: {
    kicker: "خاک و شعله؛ میراث لالجین",
    tag: "لعاب فیروزه‌ای قلیایی",
    title: "سفال، سرامیک کهن و لعاب فیروزه‌ای قلیایی",
    desc: "چرخ سفالگری و کوره‌های کهن لالجین همدان و مکتب کاشان؛ از پیاله کتیبه‌دار تا زرین‌فام بازآفرینی قرن هفتم.",
    stat1: "اثر چرخ‌دست‌ساز",
    stat2: "رنگ‌دانه معدنی",
  },
  wood: {
    kicker: "هنر چوب و خاتم",
    tag: "خاتم ۲۳۰ مفتول",
    title: "شاهکارهای چوب، خاتم شیراز و منبت آباده",
    desc: "چینش هندسی مفتول‌های آبنوس، برنج و صدف در خاتم‌کاری شیراز و کنده‌کاری ریزقلم منبت آباده بر چوب گردو.",
    stat1: "اثر دست‌کار اعلا",
    stat2: "خاتم و معرق",
  },
  textile: {
    kicker: "دار و قلم؛ پارچه‌های کهن",
    tag: "چاپ قلم و رنگ گیاهی",
    title: "نساجی سنتی، ترمه یزد و قلمکار صفوی",
    desc: "چاپ قلم اصفهان، ترمه ابریشم یزد و پته‌دوزی کرمان؛ پارچه‌هایی که با دست‌های هنرمند از قالب چوبی و رنگ گیاهی جان می‌گیرند.",
    stat1: "اثر با رنگ ثابت گیاهی",
    stat2: "چاپ چوبی اصیل",
  },
  wicker: {
    kicker: "تار و پود نخل و نی",
    tag: "بافت روستایی کهن",
    title: "سبدبافی، حصیربافی و کپوی کهن",
    desc: "بافت‌های خنک و سبک نخل و کِرتک از دزفول تا میناب؛ صنتی که از عصاره جنگل‌های کارونی و نخلستان‌های جنوب می‌آید.",
    stat1: "اثر بافت روستایی",
    stat2: "ماده‌ویره طبیعی",
  },
  jewelry: {
    kicker: "سنگ و سیم؛ زیورهای دودمانی",
    tag: "سنگ‌های اصیل ایرانی",
    title: "زیورآلات اصیل ایرانی؛ فیروزه نیشابور، عقیق سرخ و ملیله زرنگار",
    desc: "رکاب‌سازی سنتی، فیروزه‌کوبی نیشابور و ملیله‌کاری زنجان؛ هنری که سنگ و سیم را به روایت سلاطین می‌آراید.",
    stat1: "اثر سنگ‌دار تاییدشده",
    stat2: "ساخت دست کامل",
  },
  calligraphy: {
    kicker: "قلم و مرکب؛ روایت بوم",
    tag: "تذهیب و نگارگری",
    title: "تابلو، نگارگری، خوشنویسی و نقاشی",
    desc: "نسخه‌پردازی نستعلیق، تذهیب زرین و نگارگری بزم و رزم؛ میراث چشم و قلم مکتب‌های هرات، تبریز و اصفهان.",
    stat1: "اثر امضادار",
    stat2: "تکنیک کهن",
  },
};

const SORTS: Array<{ id: string; label: string }> = [
  { id: "newest", label: "جدیدترین" },
  { id: "popular", label: "محبوب‌ترین" },
  { id: "cheap", label: "ارزان‌ترین" },
  { id: "expensive", label: "گران‌ترین" },
];

export function CategoriesView({ data, navigate, onAddToCart, onToggleFavorite, isFav, route }: Shared) {
  const param = route.param ?? "all";
  const q = route.query.get("q") ?? "";
  const [search, setSearch] = useState(q);
  // Filtering recomputes only after typing settles (300ms) — the input stays snappy.
  const debouncedSearch = useDebouncedValue(search, 300);
  const [sort, setSort] = useState("newest");
  const [onlyVerified, setOnlyVerified] = useState(false);

  const cat = data.categories.find((c) => c.slug === param);
  const hero = HERO_COPY[param] ?? HERO_COPY.all;

  const results = useMemo(() => {
    let list = data.artworks.filter((a) => param === "all" || a.categorySlug === param);
    if (debouncedSearch.trim()) {
      const needle = debouncedSearch.trim();
      list = list.filter(
        (a) => a.title.includes(needle) || a.description.includes(needle) || a.seller.name.includes(needle)
      );
    }
    if (onlyVerified) list = list.filter((a) => a.authenticity?.status === "VERIFIED");
    switch (sort) {
      case "cheap":
        return [...list].sort((a, b) => a.price - b.price);
      case "expensive":
        return [...list].sort((a, b) => b.price - a.price);
      case "popular":
        return [...list].sort((a, b) => b.ratingCount - a.ratingCount);
      default:
        return [...list].sort((a, b) => Number(b.featured) - Number(a.featured));
    }
  }, [data.artworks, param, debouncedSearch, sort, onlyVerified]);

  const chips = [{ slug: "all", title: "تمام دسته‌بندی‌ها" }, ...data.categories.map((c) => ({ slug: c.slug, title: c.title }))];

  return (
    <div className="pb-space-xl">
      {/* Category chips */}
      <nav
        aria-label="دسته‌بندی آثار"
        className="bg-surface-container-low border-b border-outline-variant/40"
      >
        <div className="max-w-7xl mx-auto px-gutter py-3 flex items-center gap-2 overflow-x-auto scrollbar-none snap-x md:flex-wrap md:overflow-visible">
          {chips.map((c) => (
            <button
              key={c.slug}
              onClick={() => navigate(`categories/${c.slug}`)}
              className={cn(
                "snap-start shrink-0 px-3.5 sm:px-4 py-2 rounded-full text-[13px] sm:text-sm font-semibold whitespace-nowrap transition-all border",
                param === c.slug
                  ? "bg-primary-container text-on-primary border-primary-container shadow-sm"
                  : "bg-surface-bright text-on-surface-variant hover:text-primary border-outline-variant/50"
              )}
            >
              {c.title}
            </button>
          ))}
        </div>
      </nav>

      {/* Category hero */}
      <section className="persian-pattern-subtle">
        <div className="max-w-7xl mx-auto px-gutter py-space-md sm:py-space-lg">
          <div className="flex flex-col lg:flex-row gap-space-md sm:gap-space-lg items-stretch">
            <div className="flex-1 flex flex-col justify-center gap-3">
              <div className="flex items-center gap-2 text-on-tertiary-container">
                <MSymbol name="workspace_premium" size={22} />
                <span className="text-sm font-bold">{hero.kicker}</span>
              </div>
              <span className="inline-flex items-center gap-1.5 self-start bg-secondary/10 text-secondary text-xs font-bold rounded-full px-3 py-1.5 border border-secondary/30">
                <MSymbol name="verified" size={14} />
                {hero.tag}
              </span>
              <h1 className="font-headline-xl text-[26px] leading-[40px] sm:text-[30px] sm:leading-[46px] lg:!text-[36px] lg:!leading-[52px] text-primary font-extrabold">
                {hero.title}
              </h1>
              <p className="text-body-md text-body-md text-on-surface-variant leading-relaxed max-w-2xl">
                {hero.desc}
              </p>
              <div className="flex items-center flex-wrap gap-x-5 gap-y-3 sm:gap-x-6 pt-2">
                <div className="flex flex-col">
                  <span className="text-headline-lg font-black text-primary">{faNum(results.length)}</span>
                  <span className="text-xs text-on-surface-variant">{hero.stat1}</span>
                </div>
                <div className="w-px h-10 bg-outline-variant" />
                <div className="flex flex-col">
                  <span className="text-headline-lg font-black text-primary">{faNum(data.categories.length)}</span>
                  <span className="text-xs text-on-surface-variant">{hero.stat2}</span>
                </div>
                {cat?.tagline && (
                  <>
                    <div className="w-px h-10 bg-outline-variant" />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-on-tertiary-container">{cat.tagline}</span>
                      <span className="text-xs text-on-surface-variant">زیرشاخه فعال</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="w-full lg:w-80 xl:w-96 shrink-0 relative rounded-2xl overflow-hidden elevation-1 hidden md:block min-h-[200px] h-52 lg:h-auto">
              { }
              <img
                src={cat?.image ?? data.categories[0]?.image ?? ""}
                alt={hero.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container/60 to-transparent" />
              <div className="absolute bottom-3 right-3 left-3 text-surface-bright text-xs font-bold">
                {cat?.title ?? "ریشه"}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Filter / sort toolbar */}
      <section className="max-w-7xl mx-auto px-gutter py-4">
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-3 flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو میان نتایج…"
              aria-label="جستجوی نتایج"
              className="w-full bg-surface-container-low rounded-xl py-2.5 pr-4 pl-10 text-sm border border-outline-variant/40 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <MSymbol
              name="search"
              size={20}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
          </div>
          <label className="flex items-center gap-2 text-[13px] sm:text-sm text-on-surface-variant cursor-pointer">
            <input
              type="checkbox"
              checked={onlyVerified}
              onChange={(e) => setOnlyVerified(e.target.checked)}
              className="accent-[#186969] w-4 h-4"
            />
            فقط آثار دارای شناسنامه تاییدشده
          </label>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none -mx-1 px-1">
            <MSymbol name="tune" size={20} className="text-on-surface-variant shrink-0" />
            <span className="text-xs text-on-surface-variant whitespace-nowrap shrink-0">مرتب‌سازی:</span>
            {SORTS.map((s) => (
              <button
                key={s.id}
                onClick={() => setSort(s.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 transition-colors",
                  sort === s.id
                    ? "bg-surface-bright text-primary shadow-sm border border-outline-variant/40"
                    : "text-on-surface-variant hover:text-primary"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results grid */}
      <section className="max-w-7xl mx-auto px-gutter pb-space-xl">
        {results.length === 0 ? (
          // A search text (submitted or typed) that the real database cannot
          // match gets the branded 404 page ("صفحه خطای ۴۰۴"); filter-only
          // emptiness keeps the lighter inline empty state.
          debouncedSearch.trim() ? (
            <NotFoundView
              navigate={navigate}
              kind="search"
              query={debouncedSearch.trim()}
              categories={data.categories}
            />
          ) : (
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-8 sm:p-12 text-center flex flex-col items-center gap-3">
            <MSymbol name="search_off" size={44} className="text-outline" />
            <p className="font-headline-md text-headline-md text-primary font-bold">اثری یافت نشد</p>
            <p className="text-sm text-on-surface-variant">
              عبارت جستجو یا فیلترها را تغییر دهید؛ یا دسته‌بندی دیگری را مرور کنید.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setOnlyVerified(false);
                navigate("categories/all");
              }}
              className="mt-2 bg-primary text-on-primary rounded-xl px-5 py-2.5 text-sm font-bold hover:bg-primary-container transition"
            >
              حذف فیلترها
            </button>
          </div>
          )
        ) : (
          <div className="grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {results.map((a) => (
              <ProductCard
                key={a.id}
                artwork={a}
                onNavigate={navigate}
                onAddToCart={onAddToCart}
                onToggleFavorite={onToggleFavorite}
                favorited={isFav(a.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
