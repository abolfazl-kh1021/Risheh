import type { Metadata } from "next";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "تماس با ما", description: "ارتباط با پشتیبانی ریشه — پیام شما در صندوق پشتیبانی ثبت می‌شود.", alternates: { canonical: "/contact" } };

export default function ContactPage() {
  return <PageView view="contact" route={{ view: "contact", query: {} }} data={{ user: null, categories: [] }} />;
}
