import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { loadCategoryCounts, loadCatalog } from "@/lib/data";
import { PageView } from "@/risheh/PageView";
import { queryOf } from "@/app/_lib/page-utils";

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const CATEGORY_TITLES: Record<string, string> = {
  carpet: "فرش، گلیم و زیرانداز",
  metal: "میناکاری و قلم‌زنی",
  pottery: "سفال و سرامیک دست‌ساز",
  wood: "صنایع چوبی و خاتم",
  textile: "پارچه و نساجی سنتی",
  wicker: "سبدبافی و حصیربافی",
  jewelry: "زیورآلات و جواهرات سنتی",
  calligraphy: "تابلو، نگارگری، خوشنویسی و نقاشی",
};

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const title = CATEGORY_TITLES[slug] ?? "دسته‌بندی آثار";
  return {
    title,
    description: `${title} — آثار منتشرشده استادکاران ریشه با شناسنامه دیجیتال اصالت.`,
    alternates: { canonical: `/c/${slug}` },
  };
}

/** صفحه دسته (M1) — فیلتر/مرتب‌سازی/صفحه‌بندی سمت سرور با query string. */
export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const categories = await loadCategoryCounts();
  if (!categories.some((c) => c.slug === slug)) notFound();

  const one = (k: string): string | undefined => {
    const v = sp[k];
    return typeof v === "string" && v !== "" ? v : undefined;
  };
  const num = (k: string): number | undefined => {
    const v = one(k);
    if (v === undefined) return undefined;
    const n = Number(v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
    return Number.isFinite(n) ? n : undefined;
  };
  const sortRaw = one("sort");
  const sort = (["newest", "price-asc", "price-desc", "rating"] as const).includes(sortRaw as never)
    ? (sortRaw as "newest" | "price-asc" | "price-desc" | "rating")
    : "newest";
  const page = num("page") ?? 1;

  const catalog = await loadCatalog({
    category: slug,
    q: one("q"),
    province: one("province"),
    minPrice: num("min"),
    maxPrice: num("max"),
    verifiedOnly: one("v") === "1",
    sort,
    page,
    pageSize: 12,
  });

  return (
    <PageView
      view="categories"
      route={{
        view: "categories",
        param: slug,
        query: queryOf(sp),
      }}
      data={{
        user: null,
        categories,
        artworks: catalog.artworks,
        catalog,
      }}
    />
  );
}
