"use client";

import { useMemo, useState } from "react";
import { MSymbol } from "@/components/icons";
import { ProductCard, RatingStars } from "@/components/storefront/ProductCard";
import { faDate, faNum, faPrice } from "@/lib/fa";
import type { AppData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { NotFoundView } from "@/risheh/views/NotFoundView";

type Shared = {
  data: AppData;
  navigate: (to: string) => void;
  onAddToCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isFav: (id: string) => boolean;
};

const TABS = [
  { id: "story", label: "توضیحات و داستان اثر", icon: "menu_book" },
  { id: "specs", label: "مشخصات فنی و شناسنامه", icon: "assignment" },
  { id: "reviews", label: "دیدگاه خریداران", icon: "chat" },
  { id: "faq", label: "پرسش‌های متداول", icon: "help_outline" },
];

const FAQ = [
  {
    q: "شناسنامه اصالت چیست و چگونه تایید می‌شود؟",
    a: "هر اثر پیش از انتشار توسط کارشناسان ریشه بررسی و شناسنامه‌ای با کد یکتا در پایگاه‌داده همین سامانه ثبت می‌شود (روند نمایشی؛ آزمایشگاه مستقل خارجی نیست). صحت کد را می‌توانید در صفحه «استعلام اصالت» برخط بررسی کنید.",
  },
  {
    q: "شرایط بازگشت کالا چگونه است؟",
    a: "طبق تعهد ریشه، ۷ روز ضمانت بازگشت بی‌قید و شرط دارید؛ امکان بررسی حضوری و تطبیق اثر با دکوراسیون با بازگشت وجه کامل.",
  },
  {
    q: "ارسال چگونه انجام می‌شود؟",
    a: "آثار با بسته‌بندی مقاوم ضد آب در هاردباکس اختصاصی و بیمه ۱۰۰٪ حمل‌ونقل به سراسر کشور ارسال می‌شوند.",
  },
];

export function ProductView({ data, navigate, onAddToCart, onToggleFavorite, isFav, artworkId }: Shared & { artworkId: string }) {
  const { toast } = useToast();
  const artwork = (data.artworks ?? []).find((a) => a.id === artworkId);

  const gallery = artwork?.images ?? [];
  const [activeImg, setActiveImg] = useState(0);
  const [tab, setTab] = useState("story");
  const [size, setSize] = useState(0);
  const [color, setColor] = useState(0);
  const [qty, setQty] = useState(1);

  const related = useMemo(
    () =>
      artwork
        ? (data.artworks ?? [])
            .filter((a) => a.id !== artwork.id && (a.categorySlug === artwork.categorySlug || a.featured))
            .slice(0, 4)
        : [],
    [artwork, data.artworks]
  );

  if (!artwork) {
    return <NotFoundView navigate={navigate} kind="artwork" categories={data.categories} />;
  }

  const discount =
    artwork.compareAtPrice && artwork.compareAtPrice > artwork.price
      ? Math.round(((artwork.compareAtPrice - artwork.price) / artwork.compareAtPrice) * 100)
      : 0;

  const addToCart = () => {
    const variant = JSON.stringify({
      size: artwork.sizes[size] ? `${artwork.sizes[size].label} — ${artwork.sizes[size].dims}` : undefined,
      color: artwork.colors[color]?.label,
      qty,
    });
    void onAddToCartWithVariant(artwork.id, variant);
  };

  const onAddToCartWithVariant = async (id: string, variant: string) => {
    const { addToCartAction } = await import("@/lib/actions/cart");
    const res = await addToCartAction({ artworkId: id, quantity: qty, variant });
    if (res.ok) {
      toast({ title: "سبد خرید", description: res.message ?? "به سبد افزوده شد." });
    } else {
      toast({ title: "خطا", description: res.error, variant: "destructive" });
    }
  };

  return (
    <div className="pb-space-xl">
      {/* Breadcrumb */}
      <nav className="max-w-7xl mx-auto px-gutter py-3 flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs text-on-surface-variant" aria-label="مسیر صفحه">
        <button onClick={() => navigate("home")} className="flex items-center gap-1 hover:text-primary transition">
          <MSymbol name="home" size={16} />
          خانه
        </button>
        <span className="text-outline-variant">/</span>
        <button onClick={() => navigate("categories/all")} className="hover:text-primary transition">
          دسته‌بندی‌ها
        </button>
        <span className="text-outline-variant">/</span>
        <button onClick={() => navigate(`categories/${artwork.categorySlug}`)} className="hover:text-primary transition">
          {artwork.categoryTitle}
        </button>
        <span className="text-outline-variant">/</span>
        <span className="text-primary font-bold line-clamp-1 min-w-0">{artwork.title}</span>
      </nav>

      <div className="max-w-7xl mx-auto px-gutter">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
          {/* ===== Gallery ===== */}
          <div>
            <div className="relative rounded-2xl overflow-hidden elevation-1 bg-surface-container-lowest">
              { }
              <img
                src={gallery[activeImg] ?? ""}
                alt={artwork.title}
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute top-3 right-3 flex flex-col gap-2 items-start">
                {artwork.authenticity?.status === "VERIFIED" && (
                  <span className="inline-flex items-center gap-1 bg-secondary text-white text-[11px] font-bold rounded-full px-3 py-1.5 shadow">
                    <MSymbol name="verified" size={14} />
                    شناسنامه هولوگرام‌دار اصل
                  </span>
                )}
                {artwork.stock <= 1 && (
                  <span className="bg-pomegranate text-white text-[11px] font-bold rounded-full px-3 py-1.5 shadow">
                    تک‌نسخه موزه‌ای
                  </span>
                )}
              </div>
              <button
                onClick={() => onToggleFavorite(artwork.id)}
                aria-label="افزودن به علاقه‌مندی‌ها"
                className="absolute top-3 left-3 w-10 h-10 rounded-full bg-surface-container-lowest/90 backdrop-blur-md text-error hover:bg-surface-container-lowest shadow-md flex items-center justify-center transition-all hover:scale-110"
              >
                <MSymbol name={isFav(artwork.id) ? "favorite" : "favorite_border"} />
              </button>
            </div>
            {gallery.length > 1 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {gallery.map((g, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    aria-label={`تصویر ${i + 1}`}
                    className={cn(
                      "rounded-xl overflow-hidden border-2 transition text-right",
                      activeImg === i
                        ? "border-tertiary-fixed-dim shadow-sm"
                        : "border-surface-container-highest hover:border-outline"
                    )}
                  >
                    { }
                    <img src={g} alt={`${artwork.title} — نمای ${i + 1}`} className="w-full aspect-square object-cover" />
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-3 text-xs text-on-surface-variant bg-surface-container-low rounded-xl px-3 py-2">
              <MSymbol name="location_on" size={16} className="text-secondary" />
              دست‌بافته اصیل {artwork.province ? `• ${artwork.province}` : ""}
              <span className="mx-1 text-outline-variant">|</span>
              کد شناسه: <span className="font-bold text-primary">{artwork.code}</span>
            </div>
          </div>

          {/* ===== Purchase panel ===== */}
          <div className="flex flex-col gap-3">
            <h1 className="font-headline-xl text-[24px] leading-[38px] md:!text-[28px] md:!leading-[42px] text-primary font-extrabold leading-tight">
              {artwork.title}
            </h1>
            <p className="text-body-md text-on-surface-variant">
              اثر {artwork.seller.name}
              {artwork.province ? ` • ${artwork.province}` : ""}
              <button
                onClick={() => setTab("story")}
                className="text-secondary font-bold hover:underline inline-flex items-center gap-1 mr-2"
              >
                مشاهده کارنامه استادکار
                <MSymbol name="arrow_back" size={15} />
              </button>
            </p>
            <div className="flex items-center gap-2">
              <RatingStars rating={artwork.rating} />
              <span className="text-outline-variant">|</span>
              <span className="text-xs text-on-surface-variant">
                ({faNum(artwork.ratingCount)} نظر ثبت‌شده خریداران و کارشناسان)
              </span>
            </div>

            {/* Price */}
            <div className="bg-surface-container-low rounded-2xl p-3.5 sm:p-4 flex flex-col gap-1">
              {discount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-outline line-through">{faPrice(artwork.compareAtPrice!)}</span>
                  <span className="bg-error text-white text-[11px] font-bold rounded-full px-2 py-0.5">
                    {faNum(discount)}٪ تخفیف نوروزی
                  </span>
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-[26px] sm:text-[30px] font-black text-primary">{faPrice(artwork.price)}</span>
                <span className="text-sm text-on-surface-variant">تومان</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-secondary pt-1">
                <MSymbol name="check_circle" size={16} />
                بیمه سلامت کالا و ارسال رایگان — شامل مالیات و حق‌الزحمه شناسنامه رسمی
              </div>
            </div>

            <p className="text-body-md text-body-md text-on-surface-variant leading-relaxed">
              {artwork.description}
            </p>

            {/* Specs mini grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "ابعاد استاندارد", value: artwork.dimensions },
                { label: "متریال", value: artwork.materials },
                { label: "سال ساخت", value: artwork.yearMade },
                { label: "موجودی انبار", value: `${faNum(artwork.stock)} نسخه` },
              ]
                .filter((s) => s.value)
                .map((s) => (
                  <div key={s.label} className="bg-surface-container-lowest border border-outline-variant/40 rounded-xl p-2.5">
                    <p className="text-[11px] text-outline">{s.label}</p>
                    <p className="text-sm font-bold text-primary">{s.value}</p>
                  </div>
                ))}
            </div>

            {/* Size selector */}
            {artwork.sizes.length > 0 && (
              <div>
                <p className="text-sm font-bold text-primary mb-2">انتخاب سایز / قواره:</p>
                <div className="flex gap-2 flex-wrap">
                  {artwork.sizes.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => setSize(i)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs border-2 flex flex-col items-center transition",
                        size === i
                          ? "border-tertiary-fixed-dim bg-surface-container-lowest text-primary-container shadow-sm font-bold"
                          : "border-surface-container-highest bg-surface-container-lowest text-on-surface hover:border-outline font-medium"
                      )}
                    >
                      <span>{s.label}</span>
                      <span className="text-[10px] text-on-surface-variant">{s.dims}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selector */}
            {artwork.colors.length > 0 && (
              <div>
                <p className="text-sm font-bold text-primary mb-2">
                  تم رنگ غالب: <span className="text-on-tertiary-container">{artwork.colors[color]?.label}</span>
                </p>
                <div className="flex gap-3">
                  {artwork.colors.map((c, i) => (
                    <button
                      key={i}
                      onClick={() => setColor(i)}
                      aria-label={`رنگ ${c.label}`}
                      className={cn(
                        "w-8 h-8 rounded-full shadow-sm transition flex items-center justify-center text-white",
                        color === i ? "ring-2 ring-offset-2 ring-tertiary-fixed-dim" : "hover:ring-2 hover:ring-offset-2 hover:ring-outline-variant"
                      )}
                      style={{ backgroundColor: c.hex }}
                    >
                      {color === i && <MSymbol name="check" size={16} />}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity + add to cart */}
            <div className="flex flex-wrap sm:flex-nowrap items-stretch gap-2 pt-1">
              <div className="flex items-center border border-outline-variant/50 rounded-xl bg-surface-container-lowest px-2 gap-1">
                <button
                  onClick={() => setQty((v) => Math.min(v + 1, artwork.stock))}
                  aria-label="افزایش تعداد"
                  className="w-7 h-7 rounded-lg hover:bg-surface-container text-on-surface flex items-center justify-center font-bold"
                >
                  <MSymbol name="add" size={16} />
                </button>
                <span className="w-8 text-center text-sm font-bold">{faNum(qty)}</span>
                <button
                  onClick={() => setQty((v) => Math.max(1, v - 1))}
                  aria-label="کاهش تعداد"
                  className="w-7 h-7 rounded-lg hover:bg-surface-container text-outline flex items-center justify-center font-bold"
                >
                  <MSymbol name="remove" size={16} />
                </button>
              </div>
              <button
                onClick={addToCart}
                className="order-last sm:order-none basis-full sm:basis-0 flex-1 min-h-12 persian-gold-gradient text-tertiary-container hover:brightness-105 active:scale-[0.99] font-black text-[15px] sm:text-base py-3 sm:py-3.5 px-4 sm:px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition duration-200"
              >
                <MSymbol name="shopping_cart" />
                افزودن به سبد خرید
              </button>
              <button
                onClick={() => onToggleFavorite(artwork.id)}
                aria-label="علاقه‌مندی"
                className="border border-secondary text-secondary hover:bg-secondary/5 py-3.5 px-4 rounded-xl flex items-center justify-center transition"
              >
                <MSymbol name="favorite_border" />
              </button>
            </div>
            <div className="flex items-center gap-2 text-xs text-on-tertiary-fixed-variant bg-tertiary-fixed/40 border border-tertiary-fixed-dim/50 rounded-xl px-3 py-2.5">
              <MSymbol name="inventory_2" size={16} />
              {artwork.stock <= 1
                ? "تنها ۱ نسخه منحصر‌به‌فرد از این شاهکار در انبار نگارخانه موجود است."
                : `${faNum(artwork.stock)} نسخه از این اثر در انبار نگارخانه موجود است.`}
            </div>

            {/* Guarantees */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
              <Guarantee icon="verified_user" title="شناسنامه و هولوگرام رسمی" desc="دارای گواهی اصالت با امضای کتبی استادکار و ثبت در میراث کهن ریشه." />
              <Guarantee icon="published_with_changes" title="۷ روز ضمانت بازگشت بی‌قید" desc="امکان بررسی حضوری و تطبیق اثر با دکوراسیون با بازگشت وجه کامل." />
              <Guarantee icon="local_shipping" title="ارسال ایمن و بیمه‌شده" desc="بسته‌بندی مقاوم ضد آب در هاردباکس اختصاصی به همراه بیمه ۱۰۰٪ ترابری." />
              <Guarantee icon="security" title="پرداخت امن بانکی شتاب" desc="تسویه با درگاه‌های معتبر بانکی و امکان پرداخت اقساطی آثار موزه‌ای." />
            </div>
          </div>
        </div>

        {/* ===== Tabs ===== */}
        <div className="mt-space-xl bg-surface-container-lowest rounded-2xl elevation-1 overflow-hidden">
          <div className="flex border-b border-outline-variant/40 overflow-x-auto scrollbar-none">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "py-4 px-6 text-sm flex items-center gap-2 whitespace-nowrap transition",
                  tab === t.id
                    ? "font-black text-primary-container border-b-2 border-tertiary-fixed-dim"
                    : "font-bold text-outline hover:text-on-surface"
                )}
              >
                <MSymbol name={t.icon} size={18} />
                {t.label}
                {t.id === "reviews" && ` (${faNum(artwork.reviews.length || artwork.ratingCount)})`}
              </button>
            ))}
          </div>

          <div className="p-6">
            {tab === "story" && (
              <div className="flex flex-col gap-4">
                <h3 className="font-headline-md text-primary font-bold">روایت اثر</h3>
                <p className="text-body-lg leading-relaxed text-on-surface whitespace-pre-line">
                  {artwork.story || artwork.description}
                </p>
                <div className="flex items-start gap-3 bg-surface-container-low rounded-2xl p-4">
                  <MSymbol name="format_quote" className="text-tertiary-fixed-dim" />
                  <p className="text-sm text-on-surface-variant leading-relaxed">
                    «{artwork.story ? "این اثر با نظارت مستقیم استادکار و بافت مرحله‌به‌مرحله تحت کنترل کیفی نگارخانه ریشه خلق شده است؛ لطافت و تلألؤ آن در زاویه‌های گوناگون نور تجربه‌ای استثنایی می‌آفریند." : artwork.description}»
                    — شورای تخصصی ارزیابی نگارخانه ریشه
                  </p>
                </div>
                {/* Artisan card */}
                <div className="border border-outline-variant/40 rounded-2xl p-4 flex flex-col sm:flex-row items-start gap-4 bg-surface-bright">
                  <div className="w-16 h-16 rounded-full overflow-hidden bg-surface-container flex items-center justify-center shrink-0">
                    {artwork.seller.avatar ? (
                       
                      <img src={artwork.seller.avatar} alt={artwork.seller.name} className="w-full h-full object-cover" />
                    ) : (
                      <MSymbol name="brush" size={30} className="text-secondary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-headline-sm text-primary font-bold">{artwork.seller.name}</h4>
                      {artwork.seller.verified && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary">
                          <MSymbol name="workspace_premium" size={14} />
                          کارگاه تاییدشده ریشه
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">
                      {artwork.seller.bio || artwork.seller.shopTitle}
                    </p>
                    {artwork.seller.province && (
                      <p className="text-xs text-outline mt-1">زادگاه و کارگاه: {artwork.seller.province}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {tab === "specs" && (
              <div className="flex flex-col gap-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <tbody>
                      {[
                        { k: "کد شناسه اثر", v: artwork.code },
                        { k: "دسته‌بندی", v: artwork.categoryTitle },
                        { k: "ابعاد", v: artwork.dimensions },
                        { k: "متریال", v: artwork.materials },
                        { k: "سال ساخت", v: artwork.yearMade },
                        { k: "استان ساخت", v: artwork.province },
                        { k: "موجودی", v: `${faNum(artwork.stock)} نسخه` },
                      ]
                        .filter((r) => r.v)
                        .map((r) => (
                          <tr key={r.k} className="border-b border-outline-variant/30 last:border-0">
                            <td className="py-2.5 px-3 text-on-surface-variant w-40">{r.k}</td>
                            <td className="py-2.5 px-3 font-bold text-primary">{r.v}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {/* Authenticity record */}
                {artwork.authenticity && (
                  <div className="rounded-2xl border border-secondary/30 bg-secondary/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MSymbol name="verified_user" className="text-secondary" />
                      <h4 className="font-headline-sm text-primary font-bold">شناسنامه و آزمون‌های اصالت</h4>
                      <span className="text-[11px] font-bold text-secondary bg-secondary/10 rounded-full px-2 py-0.5">
                        کد هولوگرام: {artwork.authenticity.hologramCode}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {artwork.authenticity.tests.map((t, i) => (
                        <div key={i} className="bg-surface-bright rounded-xl p-3 border border-outline-variant/30">
                          <p className="text-xs font-bold text-primary flex items-center gap-1">
                            <MSymbol name="check_circle" size={14} className="text-secondary" />
                            {t.name}
                          </p>
                          <p className="text-[11px] text-on-surface-variant mt-1">{t.detail}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-on-surface-variant mt-3">
                      {artwork.authenticity.issuedAt
                        ? `صادرشده در ${faDate(artwork.authenticity.issuedAt)} توسط واحد اصالت‌سنجی ریشه.`
                        : "شناسنامه نهایی این اثر در فرایند تایید است."}
                    </p>
                  </div>
                )}
              </div>
            )}

            {tab === "reviews" && (
              <div className="flex flex-col gap-3">
                {artwork.reviews.length === 0 ? (
                  <div className="text-center py-8">
                    <MSymbol name="forum" size={40} className="text-outline" />
                    <p className="text-sm text-on-surface-variant mt-2">
                      هنوز دیدگاهی ثبت نشده است؛ خریداران پس از تحویل می‌توانند تجربه خود را ثبت کنند.
                    </p>
                  </div>
                ) : (
                  artwork.reviews.map((r) => (
                    <div key={r.id} className="bg-surface-container-low rounded-2xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-primary">{r.userName}</span>
                        <span className="inline-flex items-center gap-1">
                          {Array.from({ length: r.rating }).map((_, i) => (
                            <MSymbol key={i} name="star" size={14} className="text-saffron" filled />
                          ))}
                        </span>
                      </div>
                      <p className="text-sm text-on-surface-variant mt-2 leading-relaxed">{r.comment}</p>
                      <p className="text-[11px] text-outline mt-2">{faDate(r.createdAt)}</p>
                    </div>
                  ))
                )}
              </div>
            )}

            {tab === "faq" && (
              <div className="flex flex-col gap-3">
                {FAQ.map((f, i) => (
                  <details key={i} className="bg-surface-container-low rounded-xl p-4 group">
                    <summary className="flex items-center justify-between cursor-pointer text-sm font-bold text-primary list-none">
                      {f.q}
                      <MSymbol name="expand_more" size={18} className="group-open:rotate-180 transition-transform" />
                    </summary>
                    <p className="text-sm text-on-surface-variant mt-3 leading-relaxed">{f.a}</p>
                  </details>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== Related ===== */}
        {related.length > 0 && (
          <div className="mt-space-xl">
            <div className="ornament-line mb-6">
              <span className="text-sm font-bold text-on-tertiary-container">شاهکارهای مرتبط و پیشنهادی نگارخانه</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {related.map((a) => (
                <ProductCard
                  key={a.id}
                  artwork={a}
                  onNavigate={navigate}
                  onAddToCart={onAddToCart}
                  onToggleFavorite={onToggleFavorite}
                  favorited={isFav(a.id)}
                  compact
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Guarantee({ icon, title, desc }: { icon: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 bg-surface-container-low rounded-2xl p-3.5">
      <div className="w-10 h-10 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center shrink-0">
        <MSymbol name={icon} size={20} />
      </div>
      <div>
        <p className="text-sm font-bold text-primary">{title}</p>
        <p className="text-[11px] text-on-surface-variant mt-0.5 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
