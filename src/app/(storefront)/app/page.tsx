import type { Metadata } from "next";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "نصب اپلیکیشن ریشه", description: "ریشه به‌صورت PWA روی موبایل نصب می‌شود (اپ Android/iOS جداگانه در محدوده نیست).", alternates: { canonical: "/app" } };

export default function AppPage() {
  return <PageView view="app" route={{ view: "app", query: {} }} data={{ user: null, categories: [] }} />;
}
