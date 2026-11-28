import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadLabRequests } from "@/lib/data";
import { PageView } from "@/risheh/PageView";

export const metadata: Metadata = { title: "رکورد اصالت (نمایشی)", robots: { index: false, follow: false } };

export default async function LabPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const labRequests = await loadLabRequests();
  return (
    <PageView
      view="lab"
      route={{ view: "lab", query: {} }}
      data={{ user, categories: [], labRequests }}
    />
  );
}
