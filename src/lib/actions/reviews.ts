"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, dbTx } from "@/lib/db";
import { getCurrentUser, actionIp } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions/auth";
import { notify } from "@/lib/notify";

/**
 * Customer reviews (S2): ONLY buyers with a DELIVERED item can review, ONE
 * review per delivered purchase (orderItemId unique), rating aggregate updated
 * atomically. Seller reply + report flag are [Extra].
 */

const reviewSchema = z.object({
  orderItemId: z.string().min(1),
  rating: z.coerce.number().int().min(1, "امتیاز باید ۱ تا ۵ باشد").max(5),
  comment: z.string().min(5, "متن نظر باید حداقل ۵ نویسه باشد").max(1000),
});

export async function createReviewAction(input: z.input<typeof reviewSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (!(await rateLimit(`review|${await actionIp()}`, 8, 10 * 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است." };
  }
  const parsed = reviewSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };

  const item = await db.orderItem.findUnique({
    where: { id: parsed.data.orderItemId },
    include: { order: true, sellerOrder: true },
  });
  if (!item) return { ok: false, error: "قلم سفارش یافت نشد." };
  if (item.order.buyerId !== user.id) return { ok: false, error: "این سفارش متعلق به شما نیست." };
  if (item.sellerOrder?.status !== "DELIVERED") {
    return { ok: false, error: "ثبت نظر تنها پس از تحویل سفارش امکان‌پذیر است." };
  }
  const existing = await db.review.findUnique({ where: { orderItemId: item.id } });
  if (existing) return { ok: false, error: "برای این خرید قبلاً نظر ثبت کرده‌اید." };

  await dbTx(async (tx) => {
    await tx.review.create({
      data: {
        artworkId: item.artworkId,
        userId: user.id,
        orderItemId: item.id,
        rating: parsed.data.rating,
        comment: parsed.data.comment.trim(),
      },
    });
    // Atomic rating aggregate: single recompute inside the tx.
    const agg = await tx.review.aggregate({
      where: { artworkId: item.artworkId },
      _avg: { rating: true },
      _count: { _all: true },
    });
    await tx.artwork.update({
      where: { id: item.artworkId },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        ratingCount: agg._count._all,
      },
    });
    await notify({
      userId: item.sellerId,
      type: "REVIEW",
      title: "نظر جدید برای اثر شما",
      body: `امتیاز ${parsed.data.rating} از ۵ ثبت شد.`,
      link: "/dashboard/artworks",
    });
  }, { timeout: 30_000 });

  revalidatePath("/orders");
  return { ok: true, message: "نظر شما با سپاس ثبت شد." };
}

const replySchema = z.object({
  reviewId: z.string().min(1),
  reply: z.string().min(2, "پاسخ باید حداقل ۲ نویسه باشد").max(600),
});

/** [Extra] Seller response to a review on their own artwork. */
export async function replyReviewAction(input: z.input<typeof replySchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const parsed = replySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  const review = await db.review.findUnique({ where: { id: parsed.data.reviewId }, include: { artwork: true } });
  if (!review) return { ok: false, error: "نظر یافت نشد." };
  if (review.artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "فقط فروشنده اثر می‌تواند پاسخ دهد." };
  }
  await db.review.update({ where: { id: review.id }, data: { sellerReply: parsed.data.reply.trim() } });
  revalidatePath("/dashboard/artworks");
  return { ok: true, message: "پاسخ شما ثبت شد." };
}

/** [Extra] Report an inappropriate review (admin moderation queue). */
export async function reportReviewAction(reviewId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const review = await db.review.findUnique({ where: { id: reviewId } });
  if (!review) return { ok: false, error: "نظر یافت نشد." };
  await db.review.update({ where: { id: reviewId }, data: { reported: true } });
  await db.auditLog.create({
    data: { actor: user.email, action: "REVIEW_REPORT", target: reviewId },
  });
  return { ok: true, message: "گزارش شما برای بررسی مدیریت ثبت شد." };
}
