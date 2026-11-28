import type { Metadata } from "next";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "درباره ریشه", description: "داستان ریشه: پیوند مستقیم استادکار و خریدار، بدون واسطه.", alternates: { canonical: "/about" } };

export default function AboutPage() {
  return <PageView view="about" route={{ view: "about", query: {} }} data={{ user: null, categories: [] }} />;
}
