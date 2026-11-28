import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadBuyerOrders } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = {
  title: "سفارش‌ها و پیگیری",
  robots: { index: false, follow: false },
};

/** تاریخچه سفارش خریدار (M7). */
export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const myOrders = await loadBuyerOrders();
  return (
    <PageView
      view="orders"
      route={{ view: "orders", query: {} }}
      data={{
        user,
        categories: [],
        myOrders,
      }}
    />
  );
}
