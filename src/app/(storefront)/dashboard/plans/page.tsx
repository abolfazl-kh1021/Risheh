import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { loadPlanState, loadShellData } from "@/lib/data";
import { PlansManageView } from "@/risheh/views/PlansManageView";

export const metadata: Metadata = { title: "پلن من", robots: { index: false, follow: false } };

export default async function MyPlanPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") redirect("/plans");
  const [state, shell] = await Promise.all([loadPlanState(user.id), loadShellData()]);
  return (
    <PlansManageView
      subscription={state.subscription ?? null}
      activeCount={state.activeCount}
      plans={state.plans}
      categories={shell.categories}
    />
  );
}
