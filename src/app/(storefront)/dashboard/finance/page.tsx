import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadFinanceData } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "مالی و درآمد (نمایشی)", robots: { index: false, follow: false } };

export default async function FinancePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const finance = await loadFinanceData();
  return (
    <PageView
      view="finance"
      route={{ view: "finance", query: {} }}
      data={{
        user,
        categories: [],
        ledger: finance.ledger,
        balance: finance.balance,
        payouts: finance.payouts,
        invoices: finance.invoices,
        subscription: finance.subscription,
      }}
    />
  );
}
