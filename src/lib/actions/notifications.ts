"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * In-app notifications (Phase 3). Email/SMS are Won't-items — this is the
 * only channel. Users mark notifications read themselves.
 */

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  body: string;
  link?: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function listMyNotificationsAction(take = 40): Promise<NotificationItem[]> {
  const user = await getCurrentUser();
  if (!user) return [];
  const rows = await db.notification.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take,
  });
  return rows.map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    readAt: n.readAt?.toISOString() ?? null,
    createdAt: n.createdAt.toISOString(),
  }));
}

export async function markNotificationsReadAction(ids?: string[]): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  await db.notification.updateMany({
    where: { userId: user.id, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  revalidatePath("/account/notifications");
  return { ok: true, message: "اعلان‌ها خوانده‌شده علامت‌گذاری شدند." };
}
