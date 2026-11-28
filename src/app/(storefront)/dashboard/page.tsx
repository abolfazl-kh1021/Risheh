import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadShellData, loadArtisanArtworks, loadBuyerOrders, loadSellerOrderRows, loadFinanceData } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "داشبورد", robots: { index: false, follow: false } };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const shell = await loadShellData();
  if (user.role === "ARTISAN") {
    const [myArtworks, sellerOrders, finance, myOrders] = await Promise.all([
      loadArtisanArtworks(),
      loadSellerOrderRows(20),
      loadFinanceData(),
      loadBuyerOrders(10),
    ]);
    return (
      <PageView
        view="dashboard"
        route={{ view: "dashboard", query: {} }}
        data={{ user, categories: shell.categories, myArtworks, sellerOrders, artisanOrders: [], ledger: finance.ledger, balance: finance.balance, payouts: finance.payouts, myOrders, favorites: [] }}
      />
    );
  }
  const myOrders = await loadBuyerOrders(30);
  return (
    <PageView
      view="dashboard"
      route={{ view: "dashboard", query: {} }}
      data={{ user, categories: shell.categories, myOrders, favorites: [] }}
    />
  );
}
