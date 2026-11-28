import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = {
  title: "ورود | ثبت‌نام",
  robots: { index: false, follow: false },
};

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");
  return (
    <PageView
      view="login"
      route={{ view: "login", query: {} }}
      data={{ user: null, categories: [] }}
    />
  );
}
