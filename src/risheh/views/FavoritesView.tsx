"use client";

import { MSymbol } from "@/components/icons";
import { ProductCard } from "@/components/storefront/ProductCard";
import type { AppData } from "@/lib/types";

type Props = {
  data: AppData;
  navigate: (to: string) => void;
  onAddToCart: (id: string) => void;
  onToggleFavorite: (id: string) => void;
  isFav: (id: string) => boolean;
};

export function FavoritesView({ data, navigate, onAddToCart, onToggleFavorite, isFav }: Props) {
  const favIds = data.favorites ?? [];
  const items = (data.artworks ?? []).filter((a) => favIds.includes(a.id));

  return (
    <div className="max-w-7xl mx-auto px-gutter py-space-lg pb-space-xl">
      <h1 className="font-headline-lg text-primary font-extrabold">علاقه‌مندی‌های من</h1>
      <p className="text-xs text-on-surface-variant mt-1 mb-4">
        آثار نشان‌شده برای مرور و خرید بعدی — {items.length > 0 ? `${items.length} اثر ذخیره‌شده` : "بدون اثر ذخیره‌شده"}
      </p>
      {items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center flex flex-col items-center gap-2">
          <MSymbol name="favorite_border" size={40} className="text-outline" />
          <p className="text-sm text-on-surface-variant">
            هنوز اثری به علاقه‌مندی‌ها اضافه نکرده‌اید. با زدن نشان قلب روی کارت آثار، آن‌ها را اینجا ذخیره کنید.
          </p>
          <button
            onClick={() => navigate("categories/all")}
            className="bg-primary text-on-primary rounded-xl px-5 py-2.5 text-xs font-bold hover:bg-primary-container transition"
          >
            مرور گنجینه آثار
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[560px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {items.map((a) => (
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
    </div>
  );
}
