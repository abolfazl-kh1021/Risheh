import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { mapArtwork } from "@/lib/data";
import { ArtisanPublicView } from "@/risheh/views/ArtisanPublicView";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const artisan = await db.user.findUnique({ where: { slug }, select: { name: true, shopTitle: true, bio: true } });
  if (!artisan) return { title: "استادکار یافت نشد" };
  return {
    title: `${artisan.shopTitle ?? artisan.name} — صفحه استادکار`,
    description: artisan.bio?.slice(0, 150) ?? "آثار منتشرشده این استادکار در گنجینه ریشه.",
    alternates: { canonical: `/artisans/${slug}` },
  };
}

export default async function ArtisanPage({ params }: { params: Params }) {
  const { slug } = await params;
  const artisan = await db.user.findFirst({
    where: { slug, role: "ARTISAN" },
    select: { id: true, name: true, shopTitle: true, province: true, bio: true, avatar: true, verified: true, createdAt: true },
  });
  if (!artisan) notFound();
  const [artworks, sub, ratingAgg] = await Promise.all([
    db.artwork.findMany({
      where: { sellerId: artisan.id, status: "PUBLISHED", deletedAt: null },
      include: { seller: true, category: true, authenticity: true, reviews: { include: { user: true }, orderBy: { createdAt: "desc" } } },
      orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
      take: 48,
    }),
    db.subscription.findFirst({ where: { sellerId: artisan.id, status: "ACTIVE" }, include: { plan: true }, orderBy: { expiresAt: "desc" } }),
    db.artwork.aggregate({ where: { sellerId: artisan.id, status: "PUBLISHED" }, _avg: { rating: true }, _sum: { ratingCount: true } }),
  ]);
  return (
    <ArtisanPublicView
      artisan={{
        name: artisan.name,
        shopTitle: artisan.shopTitle,
        province: artisan.province,
        bio: artisan.bio,
        avatar: artisan.avatar,
        verified: artisan.verified,
        memberSince: artisan.createdAt.toISOString(),
      }}
      planBadge={sub ? sub.plan.title : null}
      rating={ratingAgg._avg.rating ?? 0}
      ratingCount={ratingAgg._sum.ratingCount ?? 0}
      artworks={artworks.map(mapArtwork)}
    />
  );
}
