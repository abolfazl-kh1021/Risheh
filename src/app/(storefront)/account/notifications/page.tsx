import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { listMyNotificationsAction } from "@/lib/actions/notifications";
import { NotificationsView } from "@/risheh/views/AccountView";

export const metadata: Metadata = { title: "اعلان‌ها", robots: { index: false, follow: false } };

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const items = await listMyNotificationsAction();
  return <NotificationsView items={items} />;
}
