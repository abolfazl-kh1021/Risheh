import { db, dbTx } from "@/lib/db";
import { getNumberSetting } from "@/lib/settings";
import { notify } from "@/lib/notify";
import { assertTransition, LISTING_MACHINE, ORDER_MACHINE, SUBSCRIPTION_MACHINE } from "@/lib/state-machines";
import { revalidatePath } from "next/cache";

/**
 * Cron tasks (Phase 1/2) — every function is idempotent and safe to run on a
 * schedule (vercel.json → /api/cron with CRON_SECRET).
 */

/** Release expired 15-minute stock reservations. */
export async function expireReservations(): Promise<number> {
  const expired = await db.stockReservation.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: new Date() } },
    select: { id: true, orderId: true },
    take: 200,
  });
  if (expired.length === 0) return 0;
  const res = await db.stockReservation.updateMany({
    where: { id: { in: expired.map((r) => r.id) }, status: "ACTIVE" },
    data: { status: "EXPIRED" },
  });
  return res.count;
}

/** Expire PENDING_PAYMENT orders past their TTL: release holds, cancel attempts. */
export async function expirePendingOrders(): Promise<number> {
  const ttlMinutes = await getNumberSetting("PENDING_PAYMENT_TTL_MINUTES");
  const cutoff = new Date(Date.now() - ttlMinutes * 60_000);
  const orders = await db.order.findMany({
    where: { status: "PENDING_PAYMENT", createdAt: { lt: cutoff } },
    select: { id: true, orderNumber: true, buyerId: true, guestKey: true, discountCodeId: true },
    take: 100,
  });
  let count = 0;
  for (const order of orders) {
    try {
      await dbTx(async (tx) => {
        const fresh = await tx.order.findUnique({ where: { id: order.id }, select: { status: true } });
        if (!fresh || fresh.status !== "PENDING_PAYMENT") return;
        assertTransition(ORDER_MACHINE, "order", fresh.status, "EXPIRED");
        await tx.order.update({ where: { id: order.id }, data: { status: "EXPIRED" } });
        await tx.stockReservation.updateMany({
          where: { orderId: order.id, status: "ACTIVE" },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
        await tx.paymentAttempt.updateMany({
          where: { orderId: order.id, status: "PENDING" },
          data: { status: "CANCELED", verifiedAt: new Date(), message: "انقضای مهلت پرداخت سفارش (cron)" },
        });
        await tx.invoice.updateMany({
          where: { orderId: order.id, status: "PENDING" },
          data: { status: "CANCELED" },
        });
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "STATUS",
            status: "EXPIRED",
            detail: `مهلت پرداخت (${ttlMinutes} دقیقه) به پایان رسید؛ رزرو موجودی آزاد شد.`,
            actor: "سامانه (cron)",
          },
        });
        if (order.buyerId) {
          await notify({
            userId: order.buyerId,
            type: "ORDER",
            title: "سفارش شما منقضی شد",
            body: `مهلت پرداخت سفارش ${order.orderNumber} به پایان رسید و موجودی آن آزاد شد.`,
            link: "/orders",
          });
        }
        count += 1;
      });
    } catch (err) {
      console.error("[cron] expirePendingOrders order failed:", err);
    }
  }
  if (count > 0) revalidatePath("/cart");
  return count;
}

/** Expire published listings past their LISTING_ACTIVE_DAYS window. */
export async function expireListings(): Promise<number> {
  const now = new Date();
  const res = await db.artwork.updateMany({
    where: { status: "PUBLISHED", expiresAt: { lt: now }, deletedAt: null },
    data: { status: "EXPIRED" },
  });
  if (res.count > 0) {
    console.log(`[cron] ${res.count} listings expired`);
  }
  return res.count;
}

/**
 * Downgrade expired subscriptions to Free (policy: surplus listings are
 * ARCHIVED — never deleted; scope §۴.۳).
 */
export async function expireSubscriptions(): Promise<number> {
  const now = new Date();
  const expired = await db.subscription.findMany({
    where: { status: "ACTIVE", expiresAt: { lt: now } },
    include: { seller: { select: { id: true, shopTitle: true } } },
    take: 200,
  });
  let count = 0;
  for (const sub of expired) {
    try {
      await dbTx(async (tx) => {
        assertTransition(SUBSCRIPTION_MACHINE, "subscription", sub.status, "EXPIRED");
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "EXPIRED" },
        });

        const plan = await tx.plan.findUnique({ where: { id: sub.planId } });
        const freePlan = await tx.plan.findUnique({ where: { id: "free" } });
        const cap = freePlan?.maxActiveListings ?? 3;

        // Keep the newest `cap` listings active; archive the surplus.
        const active = await tx.artwork.findMany({
          where: { sellerId: sub.sellerId, status: { in: ["PUBLISHED"] }, deletedAt: null },
          orderBy: { publishedAt: "desc" },
          select: { id: true, title: true },
        });
        if (plan && plan.maxActiveListings !== null && active.length > plan.maxActiveListings) {
          // Downgrade-to-free policy uses the FREE cap, not the old plan's.
          const keep = active.slice(0, cap).map((a) => a.id);
          const surplus = active.filter((a) => !keep.includes(a.id));
          if (surplus.length > 0) {
            await tx.artwork.updateMany({
              where: { id: { in: surplus.map((a) => a.id) } },
              data: { status: "ARCHIVED" },
            });
            await notify({
              userId: sub.sellerId,
              type: "PLAN",
              title: "پلن شما منقضی شد — آگهی‌های مازاد بایگانی شدند",
              body: `اشتراک «${plan.title}» به پایان رسید؛ سقف پلن رایگان ${cap} آگهی فعال است. ${surplus.length} آگهی مازاد بایگانی شد (حذف نشده‌اند) و با ارتقای پلن می‌توانید دوباره منتشر کنید.`,
              link: "/dashboard/plans",
            });
          }
        }
        await notify({
          userId: sub.sellerId,
          type: "PLAN",
          title: "پلن شما منقضی شد",
          body: `اشتراک «${plan?.title ?? ""}» به پایان رسید؛ اکنون روی پلن رایگان هستید.`,
          link: "/dashboard/plans",
        });
        count += 1;
      });
    } catch (err) {
      console.error("[cron] expireSubscriptions failed for", sub.id, err);
    }
  }
  return count;
}

/** Escrow step 3: HOLDING → CLEARED after the retention window. */
export async function releaseRetention(): Promise<number> {
  const res = await db.ledgerEntry.updateMany({
    where: { status: "HOLDING", availableAt: { lt: new Date() } },
    data: { status: "CLEARED" },
  });
  return res.count;
}
