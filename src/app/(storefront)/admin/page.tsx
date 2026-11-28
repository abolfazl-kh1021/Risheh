import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadAdminData, loadShellData } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "پیشخوان مدیریت", robots: { index: false, follow: false } };

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  if (user.role !== "ADMIN") redirect("/");
  const [admin, shell] = await Promise.all([loadAdminData(), loadShellData()]);
  return (
    <PageView
      view="admin"
      route={{ view: "admin", query: {} }}
      data={{ user, categories: shell.categories, admin }}
    />
  );
}
