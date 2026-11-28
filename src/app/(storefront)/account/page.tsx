import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, listActiveSessions } from "@/lib/session";
import { AccountView } from "@/risheh/views/AccountView";

export const metadata: Metadata = { title: "حساب من", robots: { index: false, follow: false } };

/** حساب من — پروفایل، تغییر گذرواژه، نشست‌های فعال (Phase 3). */
export default async function AccountPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/account/login");
  const { sessions, currentSessionId } = await listActiveSessions(user.id);
  return (
    <AccountView
      user={{ id: user.id, email: user.email, name: user.name, role: user.role }}
      sessions={sessions.map((s) => ({
        id: s.id,
        ip: s.ip,
        userAgent: s.userAgent,
        createdAt: s.createdAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        isCurrent: s.id === currentSessionId,
      }))}
    />
  );
}
