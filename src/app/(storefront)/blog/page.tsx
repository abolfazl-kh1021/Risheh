import type { Metadata } from "next";
import { loadBlogList } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = {
  title: "وبلاگ ریشه — داستان‌های صنایع‌دستی ایران",
  description: "مقالات اصالت‌سنجی، نگهداری آثار و روایت کارگاه استادکاران ایرانی (S4).",
  alternates: { canonical: "/blog" },
};

export default async function BlogPage() {
  const posts = await loadBlogList();
  return (
    <PageView
      view="blog"
      route={{ view: "blog", query: {} }}
      data={{ user: null, categories: [], posts }}
    />
  );
}
