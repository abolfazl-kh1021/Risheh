import type { Metadata } from "next";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = {
  title: "استعلام اصالت دیجیتال",
  description: "استعلام رکورد دیجیتال اصالت اثر با کد اثر یا هولوگرام — رکورد نگهداری‌شده توسط ریشه، نه گواهی آزمایشگاه مستقل (M10).",
  alternates: { canonical: "/verify" },
};

export default function VerifyPage() {
  return <PageView view="verify" route={{ view: "verify", query: {} }} data={{ user: null, categories: [] }} />;
}
