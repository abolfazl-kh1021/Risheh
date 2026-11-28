import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadFavorites, loadFavoriteIds } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "علاقه‌مندی‌ها", robots: { index: false, follow: false } };

export default async function FavoritesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const [favorites, favoriteIds] = await Promise.all([loadFavorites(user.id), loadFavoriteIds(user.id)]);
  return (
    <PageView
      view="favorites"
      route={{ view: "favorites", query: {} }}
      data={{ user, categories: [], artworks: favorites, favorites: favoriteIds }}
    />
  );
}
