import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadSellerOrderRows } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "سفارش‌های کارگاه", robots: { index: false, follow: false } };

export default async function SellerOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const sellerOrders = await loadSellerOrderRows(80);
  return (
    <PageView
      view="seller-orders"
      route={{ view: "seller-orders", query: {} }}
      data={{ user, categories: [], sellerOrders }}
    />
  );
}
