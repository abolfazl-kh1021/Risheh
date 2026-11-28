import type { Metadata } from "next";
import { loadHomeData } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = {
  title: "ریشه | گنجینه صنایع دستی و هنرهای سنتی ایران",
  description:
    "خرید مستقیم از استادکاران: فرش دستباف، میناکاری، خاتم، سفال، ترمه، زیورآلات سنتی و خوشنویسی — با شناسنامه دیجیتال اصالت.",
  alternates: { canonical: "/" },
};

/** خانه (M1) — Server Component with a targeted home query. */
export default async function HomePage() {
  const { categories, featured, latest, posts } = await loadHomeData();
  return (
    <PageView
      view="home"
      route={{ view: "home", query: {} }}
      data={{
        user: null,
        categories,
        artworks: [...featured, ...latest],
        posts,
      }}
    />
  );
}
