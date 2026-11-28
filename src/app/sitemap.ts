import type { MetadataRoute } from "next";
import { db } from "@/lib/db";

const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? "https://risheh-store.vercel.app";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "", "/products", "/plans", "/blog", "/about", "/contact", "/faq", "/verify",
    "/terms", "/privacy", "/shipping", "/app", "/discounts",
  ].map((p) => ({
    url: `${BASE}${p || "/"}`,
    lastModified: new Date(),
    changeFrequency: p === "" ? "daily" : "weekly",
    priority: p === "" ? 1 : 0.6,
  }));

  try {
    const [artworks, categories, posts] = await Promise.all([
      db.artwork.findMany({ where: { status: "PUBLISHED", deletedAt: null }, select: { slug: true, updatedAt: true } }),
      db.category.findMany({ select: { slug: true } }),
      db.blogPost.findMany({ select: { slug: true, createdAt: true } }),
    ]);
    return [
      ...staticRoutes,
      ...categories.map((c) => ({ url: `${BASE}/c/${c.slug}`, changeFrequency: "daily" as const, priority: 0.7 })),
      ...artworks.map((a) => ({ url: `${BASE}/products/${a.slug}`, lastModified: a.updatedAt, changeFrequency: "weekly" as const, priority: 0.8 })),
      ...posts.map((p) => ({ url: `${BASE}/blog/${p.slug}`, lastModified: p.createdAt, changeFrequency: "monthly" as const, priority: 0.5 })),
    ];
  } catch {
    return staticRoutes;
  }
}
