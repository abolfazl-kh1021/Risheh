import type { Metadata } from "next";
import { loadCategoryCounts, loadCatalog } from "@/lib/data";
import { PageView } from "@/risheh/PageView";
import { queryOf } from "@/app/_lib/page-utils";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : "";
  return {
    title: q ? `نتایج جستجوی «${q}»` : "همه دست‌سازه‌های استادکاران ایران",
    description: "فهرست کامل آثار منتشرشده استادکاران ریشه با فیلتر دسته، قیمت، استان و «اثر تاییدشده».",
    alternates: { canonical: "/products" },
    robots: { index: !q, follow: true },
  };
}

/** فهرست کامل محصولات (M1) — جستجو/مرتب‌سازی/فیلتر/صفحه‌بندی سمت سرور. */
export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
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

  const [categories, catalog] = await Promise.all([
    loadCategoryCounts(),
    loadCatalog({
      category: "all",
      q: one("q"),
      province: one("province"),
      minPrice: num("min"),
      maxPrice: num("max"),
      verifiedOnly: one("v") === "1",
      sort,
      page,
      pageSize: 12,
    }),
  ]);

  return (
    <PageView
      view="categories"
      route={{
        view: "categories",
        param: "all",
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
