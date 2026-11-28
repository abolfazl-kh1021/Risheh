import type { Metadata } from "next";
import { db } from "@/lib/db";
import { PlansPublicView } from "@/risheh/views/PlansPublicView";

export const metadata: Metadata = {
  title: "پلن‌های استادکاران — از رایگان تا طلایی",
  description: "مقایسه پلن‌های اشتراک ریشه: سقف آگهی فعال، کارمزد ثبت آگهی و امکانات (S5).",
  alternates: { canonical: "/plans" },
};

export default async function PlansPage() {
  const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  return (
    <PlansPublicView
      plans={plans.map((p) => ({
        id: p.id, slug: p.slug, title: p.title, tag: p.tag,
        priceToman: p.priceToman, periodDays: p.periodDays,
        maxActiveListings: p.maxActiveListings, listingFeeToman: p.listingFeeToman,
        commissionBps: p.commissionBps,
        features: JSON.parse(p.features || "[]") as string[],
        highlight: p.highlight,
      }))}
    />
  );
}
