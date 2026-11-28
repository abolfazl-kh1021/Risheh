import { db } from "@/lib/db";

/**
 * In-app notifications (Phase 3). Email/SMS sending is a Won't-item — this is
 * the only notification channel; the bell in the header lists unread items.
 */

export type NotificationType = "ORDER" | "ARTWORK" | "PLAN" | "PAYOUT" | "ADMIN" | "REVIEW";

export async function notify(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}): Promise<void> {
  await db.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
  });
}

export async function notifyMany(inputs: Array<Parameters<typeof notify>[0]>): Promise<void> {
  if (inputs.length === 0) return;
  await db.notification.createMany({
    data: inputs.map((i) => ({
      userId: i.userId,
      type: i.type,
      title: i.title,
      body: i.body,
      link: i.link ?? null,
    })),
  });
}

export async function unreadNotificationCount(userId: string): Promise<number> {
  return db.notification.count({ where: { userId, readAt: null } });
}
