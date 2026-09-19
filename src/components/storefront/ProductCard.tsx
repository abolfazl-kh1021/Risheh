"use client";

import { MSymbol } from "@/components/icons";
import { faNum, faPrice } from "@/lib/fa";
import type { ArtworkDTO } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RatingStars({
  rating,
  className,
  showValue = true,
}: {
  rating: number;
  className?: string;
  showValue?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <MSymbol name="star" size={16} className="text-saffron" filled />
      <span className="text-xs font-bold text-on-surface">{faNum(rating.toFixed(1))}</span>
      {showValue && null}
    </span>
  );
}

export function VerifiedBadge({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-bold text-secondary rounded-full border border-secondary/40 px-2.5 py-1 bg-secondary/5">
      <MSymbol name="verified" size={14} />
      {label ?? "دارای شناسنامه اصالت"}
    </span>
  );
}

export function ProductCard({
  artwork,
  onNavigate,
  onAddToCart,
  onToggleFavorite,
  favorited,
  compact = false,
}: {
  artwork: ArtworkDTO;
  onNavigate: (to: string) => void;
  onAddToCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  favorited?: boolean;
  compact?: boolean;
}) {
  const image = artwork.images[0] ?? "";
  const badges = [
    artwork.materials,
    artwork.dimensions,
  ].filter(Boolean) as string[];

  return (
    <article className="group bg-surface-container-lowest rounded-2xl elevation-1 hover:elevation-2 transition-all border border-transparent hover:border-on-tertiary-container/30 overflow-hidden flex flex-col">
      <div className="relative">
        <button
          onClick={() => onNavigate(`product/${artwork.id}`)}
          className="block w-full aspect-[4/3] overflow-hidden cursor-pointer"
          aria-label={`مشاهده ${artwork.title}`}
        >
          { }
          <img
            src={image}
            alt={artwork.title}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          />
        </button>
        <button
          onClick={() => onToggleFavorite(artwork.id)}
          aria-label="افزودن به علاقه‌مندی‌ها"
          className="absolute top-3 left-3 w-9 h-9 rounded-full bg-white/80 backdrop-blur-md flex items-center justify-center text-primary shadow-sm hover:text-error transition-colors"
        >
          <MSymbol name={favorited ? "favorite" : "favorite_border"} size={20} />
        </button>
        {artwork.stock <= 1 && (
          <span className="absolute top-3 right-3 bg-pomegranate text-white text-[10px] font-bold rounded-full px-2.5 py-1 shadow">
            تک‌نسخه
          </span>
        )}
      </div>

      <div className="p-3.5 sm:p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <span className="text-[11px] font-bold text-on-tertiary-container bg-tertiary-fixed/60 rounded-full px-2.5 py-1">
            {artwork.categoryTitle}
          </span>
          <RatingStars rating={artwork.rating} />
        </div>
        <button
          onClick={() => onNavigate(`product/${artwork.id}`)}
          className="text-right font-headline-sm text-headline-sm text-primary font-bold leading-snug hover:text-secondary transition-colors line-clamp-2"
        >
          {artwork.title}
        </button>
        {!compact && (
          <p className="text-body-sm text-body-sm text-on-surface-variant line-clamp-2 leading-relaxed">
            {artwork.description}
          </p>
        )}
        <div className="flex items-center gap-1.5 text-[11px] text-outline mt-auto min-w-0">
          <MSymbol name="verified" size={14} className="text-secondary" />
          <span className="truncate">
            {artwork.seller.name}
            {artwork.province ? ` • ${artwork.province}` : ""}
          </span>
        </div>
        <div className="mt-1 pt-3 border-t border-outline-variant/40 flex flex-col gap-3">
          <div className="flex items-baseline justify-between gap-x-2 gap-y-0.5 flex-wrap">
            <span className="text-[11px] text-on-surface-variant">بهای اثر هنری</span>
            <div className="flex items-baseline gap-1">
              <span className="text-xl sm:text-[22px] leading-none font-black text-primary tabular-nums">
                {faPrice(artwork.price)}
              </span>
              <span className="text-xs text-on-surface-variant">تومان</span>
            </div>
          </div>
          <div className="flex items-stretch gap-2">
            <button
              onClick={() => onAddToCart(artwork.id)}
              aria-label={`افزودن ${artwork.title} به سبد خرید`}
              className="group/cta flex-1 min-w-0 min-h-11 px-3 rounded-xl bg-gradient-to-l from-primary-container to-primary text-on-primary text-sm font-bold flex items-center justify-center gap-2 shadow-[0_6px_16px_-6px_rgba(0,38,36,0.55)] ring-1 ring-inset ring-tertiary-fixed-dim/25 transition-all duration-200 hover:from-secondary hover:to-primary-container hover:shadow-[0_10px_22px_-8px_rgba(0,38,36,0.65)] hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary-fixed-dim"
            >
              <span className="w-7 h-7 shrink-0 rounded-full bg-tertiary-fixed-dim text-tertiary flex items-center justify-center transition-transform duration-200 group-hover/cta:scale-110 group-hover/cta:-rotate-6">
                <MSymbol name="shopping_bag" size={17} />
              </span>
              <span className="whitespace-nowrap">افزودن به سبد</span>
            </button>
            <button
              onClick={() => onNavigate(`product/${artwork.id}`)}
              className="w-11 min-h-11 shrink-0 rounded-xl bg-surface-container-lowest border border-outline-variant/60 text-primary flex items-center justify-center transition-colors hover:bg-tertiary-fixed/40 hover:border-on-tertiary-container/50"
              title="مشاهده شناسنامه"
              aria-label="مشاهده شناسنامه اثر"
            >
              <MSymbol name="menu_book" size={20} />
            </button>
          </div>
        </div>
        {badges.length > 0 && (
          <div className="flex gap-1.5 flex-wrap pt-1">
            {badges.slice(0, 2).map((b, i) => (
              <span
                key={i}
                className="text-[10px] text-on-surface-variant bg-surface-container rounded-full px-2 py-0.5"
              >
                {b}
              </span>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}

export function SectionHeader({
  kicker,
  title,
  action,
}: {
  kicker?: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 mb-6">
      <div>
        {kicker && (
          <div className="ornament-line justify-start mb-2">
            <span className="ornament-diamond" />
            <span className="text-xs font-bold text-on-tertiary-container tracking-wide">{kicker}</span>
          </div>
        )}
        <h2 className="font-headline-lg text-headline-lg text-primary font-bold">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function StatusPill({ status, label }: { status: string; label: string }) {
  const tone: Record<string, string> = {
    PUBLISHED: "bg-secondary/10 text-secondary border-secondary/30",
    PENDING: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim",
    DRAFT: "bg-surface-container text-on-surface-variant border-outline-variant",
    REJECTED: "bg-error-container text-on-error-container border-error/30",
    ARCHIVED: "bg-surface-container text-outline border-outline-variant",
    SOLD: "bg-primary-container text-surface-bright border-primary",
    VERIFIED: "bg-secondary/10 text-secondary border-secondary/30",
    PAID: "bg-secondary/10 text-secondary border-secondary/30",
    PREPARING: "bg-tertiary-fixed text-on-tertiary-fixed border-tertiary-fixed-dim",
    SHIPPED: "bg-primary-fixed text-on-primary-fixed border-primary-fixed-dim",
    DELIVERED: "bg-secondary/10 text-secondary border-secondary/30",
    CANCELLED: "bg-error-container text-on-error-container border-error/30",
    PENDING_PAYMENT: "bg-surface-container text-on-surface-variant border-outline-variant",
    PAYMENT_FAILED: "bg-error-container text-on-error-container border-error/30",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[11px] font-bold rounded-full border px-2.5 py-1",
        tone[status] ?? "bg-surface-container text-on-surface-variant border-outline-variant"
      )}
    >
      {label}
    </span>
  );
}
