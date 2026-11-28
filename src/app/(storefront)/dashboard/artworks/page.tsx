import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadShellData, loadArtisanArtworks } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "مدیریت آثار", robots: { index: false, follow: false } };

export default async function ArtworksPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const shell = await loadShellData();
  const myArtworks = await loadArtisanArtworks();
  return (
    <PageView
      view="artworks"
      route={{ view: "artworks", query: {} }}
      data={{ user, categories: shell.categories, myArtworks }}
    />
  );
}
