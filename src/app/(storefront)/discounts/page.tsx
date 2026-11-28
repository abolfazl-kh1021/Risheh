import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/session";
import { loadStorefrontDiscounts } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "کمپین‌ها و کدهای تخفیف", description: "کدهای تخفیف فعال و کمپین‌های مناسبتی ریشه (S7)." };

export default async function DiscountsPage() {
  const user = await getCurrentUser();
  const discounts = await loadStorefrontDiscounts(user?.id ?? null);
  return (
    <PageView
      view="discounts"
      route={{ view: "discounts", query: {} }}
      data={{ user, categories: [], discounts }}
    />
  );
}
