"use client";

/**
 * Branded 404 / not-found page used in three situations:
 *  - a search query that matches nothing in the real database,
 *  - an unknown route,
 *  - an artwork link that no longer exists.
 * Kept inside the design system (cream surface, teal pattern, gold ornaments)
 * and always offers concrete ways forward.
 */

import { MSymbol } from "@/components/icons";
import { faNum } from "@/lib/fa";
import type { CategoryDTO } from "@/lib/types";

export function NotFoundView({
  navigate,
  kind = "search",
  query,
  categories = [],
}: {
  navigate: (to: string) => void;
  kind?: "search" | "route" | "artwork";
  query?: string;
  categories?: CategoryDTO[];
}) {
  const copy = {
    search: {
      kicker: "۴۰۴ — نتیجه‌ای پیدا نشد",
      title: `«${query ?? ""}» در گنجینه ریشه موجود نیست`,
      desc: "جستجوی شما در آثار منتشرشده استادکاران نتیجه‌ای نداشت. املای عبارت را بررسی کنید یا از دسته‌بندی‌های زیر یکی را مرور کنید.",
      icon: "search_off",
    },
    route: {
      kicker: "۴۰۴ — صفحه پیدا نشد",
      title: "نشانی‌ای که وارد کرده‌اید وجود ندارد",
      desc: "ممکن است این صفحه جابه‌جا شده یا حذف شده باشد. از دکمه‌های زیر مسیر درست را ادامه دهید.",
      icon: "location_off",
    },
    artwork: {
      kicker: "۴۰۴ — اثر پیدا نشد",
      title: "اثر مورد نظر در دسترس نیست",
      desc: "این اثر حذف شده یا شناسه آن معتبر نیست؛ اما گنجینه آثار با صدها دست‌سازه اصیل همچنان پابرجاست.",
      icon: "inventory_2",
    },
  }[kind];

  return (
    <div className="persian-pattern-subtle min-h-[62vh] flex items-center justify-center px-gutter py-space-xl">
      <div className="max-w-2xl w-full text-center bg-surface-container-lowest rounded-3xl elevation-2 border border-outline-variant/40 p-8 sm:p-12">
        <div className="relative inline-flex items-center justify-center mb-2">
          <span className="absolute w-28 h-28 rounded-full bg-tertiary-fixed/30 blur-xl" aria-hidden="true" />
          <MSymbol name={copy.icon} size={64} className="relative text-tertiary-fixed-dim" />
        </div>
        <p
          className="font-black text-primary tracking-[0.2em] text-5xl sm:text-6xl leading-none select-none"
          aria-hidden="true"
        >
          ۴۰۴
        </p>
        <div className="ornament-line my-4">
          <span className="ornament-diamond" />
        </div>
        <span className="inline-block text-[11px] font-bold text-on-tertiary-container bg-tertiary-fixed/50 rounded-full px-3 py-1 mb-3">
          {copy.kicker}
        </span>
        <h1 className="text-headline-md leading-[34px] sm:text-[24px] sm:leading-[38px] text-primary font-extrabold break-words">
          {copy.title}
        </h1>
        <p className="text-body-sm text-body-sm text-on-surface-variant leading-relaxed mt-3 max-w-md mx-auto">
          {copy.desc}
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={() => navigate("categories/all")}
            className="inline-flex items-center gap-2 bg-primary text-on-primary rounded-xl px-5 min-h-11 text-sm font-bold hover:bg-primary-container transition"
          >
            <MSymbol name="storefront" size={18} />
            مرور گنجینه آثار
          </button>
          <button
            onClick={() => navigate("home")}
            className="inline-flex items-center gap-2 bg-surface-bright border border-outline-variant/60 text-primary rounded-xl px-5 min-h-11 text-sm font-bold hover:bg-tertiary-fixed/40 transition"
          >
            <MSymbol name="home" size={18} />
            بازگشت به خانه
          </button>
        </div>

        {kind !== "route" && categories.length > 0 && (
          <div className="mt-7 pt-5 border-t border-outline-variant/40">
            <p className="text-xs text-on-surface-variant mb-3">
              پیشنهاد مرور — {faNum(categories.length)} دسته‌بندی فعال:
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              {categories.slice(0, 8).map((c) => (
                <button
                  key={c.slug}
                  onClick={() => navigate(`categories/${c.slug}`)}
                  className="px-3.5 py-2 rounded-full text-[13px] font-semibold bg-surface-container text-on-surface-variant hover:text-primary hover:bg-tertiary-fixed/40 border border-outline-variant/40 transition"
                >
                  {c.title}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
