"use client";

import { MSymbol } from "@/components/icons";
import { ProductCard } from "@/components/storefront/ProductCard";
import { faDate, faNum } from "@/lib/fa";
import type { ArtworkDTO, SellerDTO } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useAppNavigate } from "@/risheh/nav";

type ArtisanInfo = Omit<SellerDTO, "id" | "slug"> & { memberSince: string };

/** صفحه عمومی استادکار (M2) — آگهی‌ها، پلن/نشان، امتیاز و داستان کارگاه. */
export function ArtisanPublicView({
  artisan,
  planBadge,
  rating,
  ratingCount,
  artworks,
}: {
  artisan: ArtisanInfo;
  planBadge: string | null;
  rating: number;
  ratingCount: number;
  artworks: ArtworkDTO[];
}) {
  const navigate = useAppNavigate();
  return (
    <div dir="rtl" className="pb-space-xl">
      <section className="persian-pattern-subtle">
        <div className="max-w-7xl mx-auto px-gutter py-space-lg">
          <div className="flex flex-col md:flex-row gap-5 items-start">
            <div className="w-24 h-24 rounded-3xl bg-surface-container-high overflow-hidden shrink-0 elevation-2">
              {artisan.avatar ? (
                <img src={artisan.avatar} alt={artisan.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-primary">
                  <MSymbol name="palette" size={40} />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-2xl font-extrabold text-primary">{artisan.shopTitle ?? artisan.name}</h1>
                {artisan.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-primary-fixed text-on-primary-fixed text-[11px] font-bold px-2.5 py-1">
                    <MSymbol name="verified" size={13} /> کارگاه تاییدشده
                  </span>
                )}
                {planBadge && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full text-[11px] font-bold px-2.5 py-1 bg-secondary text-on-secondary")}>
                    <MSymbol name="workspace_premium" size={13} /> {planBadge}
                  </span>
                )}
              </div>
              <p className="text-sm text-on-surface-variant mt-1 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1"><MSymbol name="person" size={15} /> {artisan.name}</span>
                {artisan.province && (
                  <span className="flex items-center gap-1"><MSymbol name="location_on" size={15} /> {artisan.province}</span>
                )}
                <span className="flex items-center gap-1"><MSymbol name="star" size={15} /> {faNum(Math.round(rating * 10) / 10)} از ۵ ({faNum(ratingCount)} نظر)</span>
                <span className="flex items-center gap-1"><MSymbol name="history" size={15} /> عضو از {faDate(artisan.memberSince)}</span>
              </p>
              {artisan.bio && <p className="text-sm leading-7 text-on-surface mt-3 max-w-3xl">{artisan.bio}</p>}
            </div>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-gutter py-space-lg">
        <h2 className="text-lg font-bold text-primary mb-4">
          آثار منتشرشده ({faNum(artworks.length)})
        </h2>
        {artworks.length === 0 ? (
          <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center">
            <MSymbol name="brush" size={40} className="text-outline" />
            <p className="mt-2 text-sm text-on-surface-variant">هنوز اثری از این کارگاه منتشر نشده است.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {artworks.map((a) => (
              <ProductCard
                key={a.id}
                artwork={a}
                onNavigate={(to) => navigate(to)}
                onAddToCart={() => {}}
                onToggleFavorite={() => {}}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
