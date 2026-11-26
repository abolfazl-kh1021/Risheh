"use client";

import { MSymbol } from "@/components/icons";
import { AppInstallSection } from "@/components/storefront/AppInstallSection";
import { HeroCarousel, type CarouselSlide } from "@/components/storefront/HeroCarousel";
import { faNum, faPrice } from "@/lib/fa";
import type { AppData, ArtworkDTO } from "@/lib/types";
import { HOME_IMG } from "@/risheh/homeAssets";
import { cn } from "@/lib/utils";

type Props = {
  data: AppData;
  navigate: (to: string) => void;
  onAddToCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
};

/** Category tiles in the exact order/images of the original home page. */
const CAT_TILES: Array<{ label: string; img: string; slug: string; twoLine?: boolean }> = [
  { label: "سبد و حصیربافی", img: HOME_IMG.Ueeeb924a, slug: "wicker" },
  { label: "میناکاری و قلم‌زنی", img: "/assets/img/img_67ed982169b6.webp", slug: "metal" },
  { label: "زیورآلات سنتی", img: HOME_IMG.U41b9ce28, slug: "jewelry" },
  { label: "پارچه و نساجی", img: HOME_IMG.Ub2add9dd, slug: "textile" },
  { label: "سفال و سرامیک", img: HOME_IMG.Ua88c3729, slug: "pottery" },
  { label: "صنایع چوبی", img: HOME_IMG.U4f3c94c2, slug: "wood" },
  { label: "فرش و گلیم", img: HOME_IMG.U48d9e309, slug: "carpet" },
  { label: "تابلو ، نگارگری\nخوشنویسی ، نقاشی", img: HOME_IMG.U678093b4, slug: "calligraphy", twoLine: true },
];

const FEATURED: Array<{ slug: string; rating: string; title: string; img: string }> = [
  { slug: "shikargah-silk-qashqai", rating: "۴.۸", title: "فرش دستباف ایرانی", img: HOME_IMG.Uadb2247f },
  { slug: "home-featured-1", rating: "۴.۷", title: "گلدان میناکاری", img: HOME_IMG.U3cdb46f6 },
  { slug: "home-featured-2", rating: "۴.۹", title: "جعبه چوبی خاتم‌کاری", img: HOME_IMG.Uf0083490 },
  { slug: "home-featured-3", rating: "۴.۸", title: "بشقاب میناکاری", img: HOME_IMG.U43b32f52 },
  { slug: "home-featured-4", rating: "۴.۷", title: "رومیزی قلمکار", img: HOME_IMG.U5f76e62c },
];

/**
 * Carousel slides — every slide promotes a different section of the site and
 * carries its own image (main store, authenticity verification, blog,
 * about/ateliers, app install).
 */
const SLIDES: CarouselSlide[] = [
  {
    id: "store",
    kicker: "اصالت، ذوق و هنر ایرانی",
    titleGold: "هنر،",
    titleWhite: "در دستان شما",
    desc: "خرید و فروش آثار هنری و صنایع دستی اصیل ایرانی به صورت مستقیم از برجسته‌ترین استادکاران و هنرمندان",
    cta: "مشاهده محصولات",
    img: HOME_IMG.Ua97b0e9f,
    target: "categories/all",
  },
  {
    id: "verify",
    kicker: "شناسنامه رسمی اصالت",
    titleGold: "اصالت هر اثر،",
    titleWhite: "قابل استعلام",
    desc: "هر اثر با هولوگرام و شناسنامه دیجیتال عرضه می‌شود؛ کد شناسنامه را وارد کنید و اصالت آن را همین حالا استعلام بگیرید.",
    cta: "استعلام اصالت اثر",
    img: "/assets/img/img_ca1d96390021.webp",
    target: "verify",
  },
  {
    id: "blog",
    kicker: "دانشنامه هنرهای دستی",
    titleGold: "با راز هنرهای کهن",
    titleWhite: "آشنا شوید",
    desc: "از فلسفه رنگ فیروزه‌ای سفال لالجین تا راز گره‌های فرش عشایری؛ مقالات تخصصی ریشه شما را با روح هنر ایرانی همراه می‌کند.",
    cta: "مطالعه وبلاگ",
    img: "/assets/img/img_ba422ffe1783.webp",
    target: "blog",
  },
  {
    id: "about",
    kicker: "روایت کارگاه‌ها و استادکاران",
    titleGold: "از دل کارگاه‌های",
    titleWhite: "اصیل ایران",
    desc: "با مکتب‌های نام‌آور اصفهان، یزد، تبریز و شیراز آشنا شوید؛ استادکارانی که هر اثر را با امضای خود و مهر اصالت عرضه می‌کنند.",
    cta: "آشنایی با ریشه",
    img: "/assets/img/img_08307b5171ff.webp",
    target: "about",
  },
  {
    id: "app",
    kicker: "اپلیکیشن ریشه",
    titleGold: "گنجینه ریشه،",
    titleWhite: "در جیب شما",
    desc: "با نصب اپ ریشه، سریع‌تر بخرید، از تخفیف‌ها زودتر باخبر شوید و حتی بدون اینترنت آثار بازدیدشده را مرور کنید.",
    cta: "نصب اپلیکیشن",
    img: "/assets/img/dl_af6f95412a.webp",
    scrollTarget: "app-install",
  },
];

export function HomeView({ data, navigate, onAddToCart, onToggleFavorite }: Props) {
  const bySlug = (slug: string): ArtworkDTO | undefined =>
    data.artworks.find((a) => a.slug === slug) ??
    data.artworks.find((a) => a.title.includes(FEATURED.find((f) => f.slug === slug)?.title ?? "__"));

  const featured = FEATURED.map((f) => bySlug(f.slug)).filter(Boolean) as ArtworkDTO[];

  return (
    <div className="persian-pattern-bg min-h-[60vh]">
      {/* ============ Hero carousel (one slide per site section) ============ */}
      <section className="w-full px-3 md:px-8 py-4" aria-roledescription="carousel" aria-label="معرفی بخش‌های ریشه">
        <div
          className="max-w-7xl mx-auto relative rounded-3xl overflow-hidden shadow-2xl border border-[#E9DAC3]"
          style={{ background: "radial-gradient(circle at 75% 50%, #0d3833 0%, #07221e 100%)" }}
        >
          <HeroCarousel slides={SLIDES} navigate={navigate} />
        </div>
      </section>

      {/* ============ Categories ============ */}
      <section className="max-w-7xl mx-auto px-3 md:px-8 py-6">
        <div className="text-center mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand-darkText">دسته‌بندی‌ها</h2>
          <div className="ornament-line mt-3">
            <span className="ornament-diamond" />
          </div>
        </div>
        <div className="flex md:grid md:grid-cols-4 lg:grid-cols-8 gap-3 md:gap-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory scrollbar-none -mx-3 px-3 md:mx-0 md:px-0 pb-2 md:pb-0">
          {CAT_TILES.map((c) => (
            <button
              key={c.slug}
              onClick={() => navigate(`categories/${c.slug}`)}
              className="group snap-start shrink-0 w-[112px] sm:w-[128px] md:w-auto bg-brand-cardBg border border-brand-borderTone rounded-2xl p-2.5 md:p-3 flex flex-col items-center justify-center craft-shadow text-center"
            >
              <div className="w-full aspect-square rounded-xl overflow-hidden mb-3 bg-[#f4ecdf]">
                <img
                  alt={c.label.replace("\n", " ")}
                  src={c.img}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
              <span className="text-xs md:text-[13px] font-bold text-brand-darkText leading-snug whitespace-pre-line">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* ============ Featured products ============ */}
      <section className="max-w-7xl mx-auto px-3 md:px-8 py-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl md:text-3xl font-extrabold text-brand-darkText">محصولات ویژه</h2>
          <button
            onClick={() => navigate("categories/all")}
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-bold text-brand-muted hover:text-brand-gold border border-brand-borderTone bg-brand-cardBg px-4 py-2 rounded-full transition craft-shadow"
          >
            مشاهده همه
            <MSymbol name="chevron_left" size={16} />
          </button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 md:gap-5">
          {featured.map((a) => (
            <div
              key={a.id}
              className="group bg-brand-cardBg border border-brand-borderTone rounded-2xl overflow-hidden craft-shadow flex flex-col"
            >
              <div className="relative">
                <button
                  onClick={() => navigate(`product/${a.id}`)}
                  className="block w-full aspect-[4/3] overflow-hidden"
                  aria-label={a.title}
                >
                  <img
                    alt={a.title}
                    src={a.images[0]}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </button>
                <button
                  onClick={() => onToggleFavorite(a.id)}
                  aria-label="افزودن به علاقه‌مندی‌ها"
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white text-gray-400 hover:text-red-500 flex items-center justify-center shadow-md backdrop-blur-sm transition"
                >
                  <MSymbol name="favorite_border" size={16} />
                </button>
              </div>
              <div className="p-3 flex flex-col gap-2 flex-1">
                <button
                  onClick={() => navigate(`product/${a.id}`)}
                  className="text-right text-sm font-bold text-brand-darkText leading-snug hover:text-brand-teal transition-colors line-clamp-1"
                >
                  {a.title}
                </button>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 text-xs text-brand-muted">
                    <MSymbol name="star" size={14} className="text-amber-500" filled />
                    {faNum(a.rating.toFixed(1))}
                  </span>
                  <button
                    onClick={() => onAddToCart(a.id)}
                    aria-label={`افزودن ${a.title} به سبد خرید`}
                    className="w-8 h-8 rounded-full bg-brand-teal hover:bg-brand-darkTeal text-white flex items-center justify-center transition shadow"
                  >
                    <MSymbol name="shopping_cart" size={15} />
                  </button>
                </div>
                <div className="flex items-baseline gap-1 mt-auto pt-1 border-t border-brand-borderTone/60">
                  <span className="text-base font-black text-brand-darkText">{faPrice(a.price)}</span>
                  <span className="text-[11px] text-brand-muted">تومان</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============ App install (QR + features + one-tap install) ============ */}
      <AppInstallSection />

      {/* ============ Trust badges (original section) ============ */}
      <section className="w-full px-3 md:px-8 py-6">
        <div className="max-w-7xl mx-auto relative rounded-3xl p-6 md:p-8 overflow-hidden bg-gradient-to-r from-[#DFCDAE] via-[#EADBCA] to-[#DFCDAE] border border-[#D5C1A2] shadow-sm">
          <div className="absolute inset-0 opacity-15 pointer-events-none mix-blend-multiply flex items-end">
            <svg className="w-full h-auto" fill="#0E3B36" viewBox="0 0 1200 120" aria-hidden="true">
              <path d="M0,120 L0,80 Q40,40 80,75 T160,85 Q220,10 260,70 T380,80 Q420,30 460,75 T560,90 Q650,5 710,70 T820,80 Q900,20 950,75 T1080,85 L1200,80 L1200,120 Z" />
            </svg>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
            <TrustBadge
              title="ارسال سریع به سراسر کشور"
              subtitle="در کوتاه‌ترین زمان ممکن"
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M8 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10h10zm0 0h4m-4-6h3.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.293.707V16h-3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <TrustBadge
              title="پرداخت امن و مطمئن"
              subtitle="با تمامی درگاه‌های معتبر بانکی"
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <TrustBadge
              title="بسته‌بندی شیک و مطمئن"
              subtitle="با عشق به هنر اصیل ایرانی"
              icon={
                <svg
                  className="w-7 h-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.8}
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
}

function TrustBadge({ title, subtitle, icon }: { title: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="bg-[#F8EEDA]/80 backdrop-blur-sm border border-[#E0CFB7] rounded-2xl p-4 flex items-center justify-between craft-shadow">
      <div className="text-right">
        <h4 className={cn("font-bold text-sm text-brand-darkText")}>{title}</h4>
        <p className="text-xs text-brand-muted mt-0.5">{subtitle}</p>
      </div>
      <div className="w-12 h-12 rounded-xl bg-brand-teal/10 flex items-center justify-center text-brand-teal shrink-0">
        {icon}
      </div>
    </div>
  );
}
