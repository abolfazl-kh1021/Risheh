import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getCurrentUser, getGuestKey } from "@/lib/session";
import { loadOrderForViewer } from "@/lib/data";
import { OrderDetailView } from "@/risheh/views/OrderDetailView";

type Params = Promise<{ orderNumber: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "جزئیات سفارش",
  robots: { index: false, follow: false },
};

/**
 * جزئیات سفارش (M7) — بازدید بر اساس نقش:
 * خریدارِ سفارش، فروشنده‌ی آیتم‌ها (بخش خودش) یا ادمین. غیرمجازها ۴۰۴ می‌بینند.
 */
export default async function OrderDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { orderNumber } = await params;
  const sp = await searchParams;
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  if (!user && !guestKey) redirect(`/account/login?next=/orders/${orderNumber}`);
  const order = await loadOrderForViewer(orderNumber, user ? { id: user.id, role: user.role } : null, guestKey);
  if (!order) notFound();

  return <OrderDetailView order={order} payParam={typeof sp.pay === "string" ? sp.pay : undefined} />;
}
