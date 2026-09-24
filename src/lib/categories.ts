import type { CategoryDTO } from "@/lib/types";

/**
 * The eight canonical storefront categories, in display order.
 * Mirrors `catDefs` in prisma/seed.ts. Used as a safety net so every category
 * (notably «تابلو، نگارگری، خوشنویسی و نقاشی») always appears in the header,
 * the category chips and the footer — even if the local database was seeded
 * before that category existed.
 */
const CANONICAL: Array<Pick<CategoryDTO, "slug" | "title" | "tagline">> = [
  { slug: "carpet", title: "فرش، گلیم و زیرانداز", tagline: "قالیبافی و گلیم" },
  { slug: "metal", title: "میناکاری و قلم‌زنی", tagline: "نقش و آتش بر مس" },
  { slug: "pottery", title: "سفال و سرامیک دست‌ساز", tagline: "سفالگری و لعاب کهن" },
  { slug: "wood", title: "صنایع چوبی و خاتم", tagline: "خاتم‌کاری و منبت" },
  { slug: "textile", title: "پارچه و نساجی سنتی", tagline: "ترمه، قلمکار و دارایی" },
  { slug: "wicker", title: "سبدبافی و حصیربافی", tagline: "کپوبافی و حصیر نخل" },
  { slug: "jewelry", title: "زیورآلات و جواهرات سنتی", tagline: "فیروزه و نقره‌کاری" },
  { slug: "calligraphy", title: "تابلو، نگارگری، خوشنویسی و نقاشی", tagline: "هنرهای روی بوم و کاغذ" },
];

/** Returns `categories` plus any canonical category missing from it (appended, count 0). */
export function withCanonicalCategories(categories: CategoryDTO[]): CategoryDTO[] {
  const have = new Set(categories.map((c) => c.slug));
  const missing: CategoryDTO[] = CANONICAL.filter((c) => !have.has(c.slug)).map((c) => ({
    id: `fallback-${c.slug}`,
    slug: c.slug,
    title: c.title,
    tagline: c.tagline,
    image: categories[0]?.image ?? null,
    count: 0,
  }));
  return missing.length ? [...categories, ...missing] : categories;
}
