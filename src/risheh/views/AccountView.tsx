"use client";

import { useState, useTransition } from "react";
import { useToast } from "@/hooks/use-toast";
import { MSymbol } from "@/components/icons";
import { faDateTime } from "@/lib/fa";
import { changePasswordAction, logoutAllDevicesAction, revokeSessionAction } from "@/lib/actions/auth";
import { markNotificationsReadAction, type NotificationItem } from "@/lib/actions/notifications";
import { cn } from "@/lib/utils";

type SessionRow = {
  id: string;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

/**
 * حساب من (Phase 3) — پروفایل، تغییر گذرواژه با گذرواژه فعلی،
 * «خروج از همه‌ی دستگاه‌ها» و صفحه نشست‌های فعال (IP/UA/زمان).
 */
export function AccountView({
  user,
  sessions,
}: {
  user: { id: string; email: string; name: string; role: string };
  sessions: SessionRow[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newPassword2, setNewPassword2] = useState("");

  const changePassword = () =>
    startTransition(async () => {
      if (newPassword !== newPassword2) {
        toast({ title: "خطا", description: "تکرار گذرواژه جدید مطابقت ندارد.", variant: "destructive" });
        return;
      }
      const res = await changePasswordAction({ currentPassword, newPassword });
      if (res.ok) {
        toast({ title: "گذرواژه", description: res.message });
        setCurrentPassword("");
        setNewPassword("");
        setNewPassword2("");
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    });

  const logoutAll = () =>
    startTransition(async () => {
      const res = await logoutAllDevicesAction();
      if (res.ok) {
        toast({ title: "خروج", description: res.message });
        window.location.href = "/";
      }
    });

  const revoke = (id: string) =>
    startTransition(async () => {
      const res = await revokeSessionAction(id);
      if (res.ok) {
        toast({ title: "نشست‌ها", description: res.message });
        window.location.reload();
      } else {
        toast({ title: "خطا", description: res.error, variant: "destructive" });
      }
    });

  const roleFa = user.role === "ADMIN" ? "مدیر سامانه" : user.role === "ARTISAN" ? "استادکار" : "خریدار";

  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <h1 className="text-xl font-bold text-primary mb-1">حساب من</h1>
      <p className="text-xs text-on-surface-variant mb-5">
        {user.name} — {user.email} ({roleFa})
      </p>

      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 mb-4">
        <h2 className="font-bold text-primary mb-3 flex items-center gap-2">
          <MSymbol name="lock_reset" className="text-secondary" />
          تغییر گذرواژه
        </h2>
        <div className="grid gap-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="گذرواژه فعلی"
            autoComplete="current-password"
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="گذرواژه جدید (حداقل ۸ نویسه، شامل حرف و رقم)"
            autoComplete="new-password"
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm"
          />
          <input
            type="password"
            value={newPassword2}
            onChange={(e) => setNewPassword2(e.target.value)}
            placeholder="تکرار گذرواژه جدید"
            autoComplete="new-password"
            className="rounded-xl border border-outline-variant/40 bg-surface-container-low px-3 py-2.5 text-sm"
          />
          <button
            onClick={changePassword}
            disabled={pending || !currentPassword || !newPassword}
            className="rounded-full bg-primary text-on-primary px-5 py-2.5 text-sm font-bold w-max disabled:opacity-60"
          >
            {pending ? "در حال ثبت…" : "تغییر گذرواژه و بستن نشست‌های دیگر"}
          </button>
        </div>
      </section>

      <section className="bg-surface-container-lowest rounded-2xl elevation-1 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-primary flex items-center gap-2">
            <MSymbol name="devices" className="text-secondary" />
            نشست‌های فعال ({sessions.length})
          </h2>
          <button
            onClick={logoutAll}
            disabled={pending}
            className="rounded-full border border-error/50 text-error px-4 py-2 text-xs font-bold disabled:opacity-60"
          >
            خروج از همه‌ی دستگاه‌ها
          </button>
        </div>
        <div className="space-y-2">
          {sessions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "rounded-xl border p-3 text-xs",
                s.isCurrent ? "border-secondary/50 bg-secondary/5" : "border-outline-variant/40 bg-surface-container-low"
              )}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-bold text-primary">
                  {s.isCurrent ? "نشست فعلی" : "نشست دیگر"}
                </span>
                {!s.isCurrent && (
                  <button onClick={() => revoke(s.id)} disabled={pending} className="text-[11px] text-error hover:underline">
                    بستن این نشست
                  </button>
                )}
              </div>
              <p className="mt-1 text-on-surface-variant" dir="ltr" style={{ textAlign: "left" }}>
                IP: {s.ip ?? "—"}
              </p>
              <p className="text-on-surface-variant truncate max-w-full" title={s.userAgent ?? ""}>
                مرورگر: {s.userAgent?.slice(0, 80) ?? "—"}
              </p>
              <p className="text-outline mt-1">
                ورود: {faDateTime(s.createdAt)} — انقضا: {faDateTime(s.expiresAt)}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/** فهرست اعلان‌های درون‌برنامه‌ای (بدون ایمیل/پیامک — Won't). */
export function NotificationsView({ items }: { items: NotificationItem[] }) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const unread = items.filter((i) => !i.readAt).length;

  const markAll = () =>
    startTransition(async () => {
      const res = await markNotificationsReadAction();
      if (res.ok) {
        toast({ title: "اعلان‌ها", description: res.message });
        window.location.reload();
      }
    });

  return (
    <div className="max-w-3xl mx-auto px-gutter py-space-lg pb-space-xl" dir="rtl">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-primary">اعلان‌ها {unread > 0 && `(${unread} خوانده‌نشده)`}</h1>
        {unread > 0 && (
          <button onClick={markAll} disabled={pending} className="rounded-full bg-primary text-on-primary px-4 py-2 text-xs font-bold disabled:opacity-60">
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </button>
        )}
      </div>
      {items.length === 0 ? (
        <div className="bg-surface-container-lowest rounded-2xl elevation-1 p-10 text-center">
          <MSymbol name="notifications_none" size={40} className="text-outline" />
          <p className="mt-2 text-sm text-on-surface-variant">اعلانی ندارید.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <a
              key={n.id}
              href={n.link ?? "#"}
              className={cn(
                "block rounded-xl border p-3 transition hover:border-primary",
                n.readAt ? "border-outline-variant/30 bg-surface-container-lowest" : "border-secondary/50 bg-secondary/5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-bold text-primary">{n.title}</p>
                {!n.readAt && <span className="w-2 h-2 rounded-full bg-secondary shrink-0" />}
              </div>
              <p className="text-xs text-on-surface-variant mt-1 leading-5">{n.body}</p>
              <p className="text-[10px] text-outline mt-1">{faDateTime(n.createdAt)}</p>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
