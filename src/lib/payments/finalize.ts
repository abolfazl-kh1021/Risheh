import { db, dbTx } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments";
import { applyBps, splitProportionally } from "@/lib/money";
import { assertTransition, PAYMENT_MACHINE, INVOICE_MACHINE, ORDER_MACHINE } from "@/lib/state-machines";
import { getNumberSetting } from "@/lib/settings";
import { notify } from "@/lib/notify";
import type { PaymentAttempt, Prisma } from "@prisma/client";

/**
 * THE single payment finalization path (Phase 1, M6).
 *
 * Every paid flow — buyer order, listing registration fee, subscription — is
 * finalized ONLY here, ONLY after `provider.verify()` returns a verdict, ONLY
 * from the server callback (never from a client-supplied result).
 *
 * Idempotency: the PaymentAttempt row is CLAIMED atomically with
 * `updateMany({ where: { id, status: "PENDING" } })` — a second call can never
 * double-finalize (the claim returns 0 rows and we short-circuit).
 *
 * Concurrency: stock decrement is guarded (`stock >= qty`) inside one
 * interactive transaction; insufficient stock rolls back the WHOLE
 * finalization atomically.
 */

export class AlreadyFinalizedError extends Error {
  constructor(public currentStatus: string) {
    super(`payment already finalized as ${currentStatus}`);
    this.name = "AlreadyFinalizedError";
  }
}

export class StockChangedError extends Error {
  constructor(public title: string) {
    super(`stock changed for ${title}`);
    this.name = "StockChangedError";
  }
}

export type FinalizeResult = {
  status: "SUCCESS" | "FAILED" | "CANCELED" | "ALREADY";
  orderNumber?: string;
  refNumber?: string;
  message: string;
  redirectPath: string;
};

// ---------------------------------------------------------------------------
// Available stock = physical stock − active reservations (shared helper)
// ---------------------------------------------------------------------------

export async function availableStock(artworkId: string): Promise<number> {
  const aw = await db.artwork.findUnique({
    where: { id: artworkId },
    select: { stock: true, _count: { select: { reservations: { where: { status: "ACTIVE" } } } } },
  });
  if (!aw) return 0;
  const reserved = await db.stockReservation.aggregate({
    where: { artworkId, status: "ACTIVE" },
    _sum: { quantity: true },
  });
  void aw;
  return aw.stock - (reserved._sum.quantity ?? 0);
}

// ---------------------------------------------------------------------------
// Failure / cancel path (shared by callback + cron expiry)
// ---------------------------------------------------------------------------

/** Mark a pending attempt failed/canceled server-side (never from a client). */
export async function failPaymentAttempt(
  attempt: Pick<PaymentAttempt, "id" | "status" | "orderId" | "invoiceId">,
  to: "FAILED" | "CANCELED",
  detail: string
): Promise<void> {
  assertTransition(PAYMENT_MACHINE, "payment", attempt.status, to);
  const isOrder = Boolean(attempt.orderId);
  await dbTx(async (tx) => {
    // Atomic claim — only one path may finalize this attempt.
    const claimed = await tx.paymentAttempt.updateMany({
      where: { id: attempt.id, status: "PENDING" },
      data: { status: to, verifiedAt: new Date(), message: detail },
    });
    if (claimed.count === 0) throw new AlreadyFinalizedError("PENDING→" + to);

    if (attempt.invoiceId) {
      await tx.invoice.updateMany({
        where: { id: attempt.invoiceId, status: "PENDING" },
        data: { status: to === "CANCELED" ? "CANCELED" : "FAILED" },
      });
    }

    if (isOrder && attempt.orderId) {
      const order = await tx.order.findUnique({
        where: { id: attempt.orderId },
        select: { id: true, status: true, orderNumber: true, discountCodeId: true, discount: true, buyerId: true },
      });
      if (order) {
        assertTransition(ORDER_MACHINE, "order", order.status, to === "CANCELED" ? "CANCELLED" : "PAYMENT_FAILED");
        await tx.order.update({
          where: { id: order.id },
          data: { status: to === "CANCELED" ? "CANCELLED" : "PAYMENT_FAILED" },
        });
        await tx.orderEvent.create({
          data: {
            orderId: order.id,
            type: "PAYMENT",
            status: to,
            detail: detail,
            actor: "درگاه پرداخت",
          },
        });
        // Release ACTIVE reservations of this order.
        await tx.stockReservation.updateMany({
          where: { orderId: order.id, status: "ACTIVE" },
          data: { status: "RELEASED", releasedAt: new Date() },
        });
        if (order.buyerId) {
          await notify({
            userId: order.buyerId,
            type: "ORDER",
            title: to === "CANCELED" ? "پرداخت سفارش لغو شد" : "پرداخت سفارش ناموفق بود",
            body: `${detail} — سفارش ${order.orderNumber}`,
            link: `/orders/${order.orderNumber}`,
          });
        }
      }
    }

    await tx.paymentEvent.create({
      data: { paymentAttemptId: attempt.id, type: to === "CANCELED" ? "VERIFY_CANCELED" : "VERIFY_FAILED", detail },
    });
    await tx.auditLog.create({
      data: { actor: "payment-gateway", action: "PAYMENT_" + to, target: attempt.id, detail },
    });
  });
}

/**
 * Reservation-aware discount bookkeeping happens inside finalization only;
 * a failed/canceled order never consumed a discount use, so nothing to
 * restore. (Single-place rule: the logic lives in the SUCCESS path above.)
 */

// ---------------------------------------------------------------------------
// Order finalization
// ---------------------------------------------------------------------------

export async function finalizeOrderPayment(authority: string): Promise<FinalizeResult> {
  const provider = getPaymentProvider();
  const attempt = await db.paymentAttempt.findUnique({ where: { authority } });
  if (!attempt || !attempt.orderId) {
    return {
      status: "FAILED",
      message: "شناسه پرداخت یافت نشد یا به سفارشی متصل نیست.",
      redirectPath: "/cart",
    };
  }
  if (attempt.status !== "PENDING") {
    // Idempotent: the attempt was already finalized — never double-apply (M6).
    const order = await db.order.findUnique({
      where: { id: attempt.orderId },
      select: { orderNumber: true, status: true },
    });
    const alreadySuccess = attempt.status === "SUCCESS";
    return {
      status: "ALREADY",
      orderNumber: order?.orderNumber,
      refNumber: attempt.refNumber ?? undefined,
      message: alreadySuccess
        ? "این پرداخت پیش‌تر نهایی شده است (ضد تکرار)."
        : "این پرداخت قبلاً با نتیجه‌ای دیگر بسته شده است.",
      redirectPath: order ? `/orders/${order.orderNumber}` : "/cart",
    };
  }

  const verdict = await provider.verify({ authority, amount: attempt.amount });

  if (verdict.status !== "SUCCESS") {
    const msg =
      verdict.status === "CANCELED"
        ? "پرداخت نمایشی توسط کاربر لغو شد؛ سبد خرید شما حفظ شده است."
        : "پرداخت ناموفق بود (شبیه‌سازی خطای درگاه)؛ می‌توانید دوباره تلاش کنید.";
    await failPaymentAttempt(attempt, verdict.status === "CANCELED" ? "CANCELED" : "FAILED", msg + " — نتیجه نمایشی");
    return {
      status: verdict.status,
      orderNumber: (await db.order.findUnique({ where: { id: attempt.orderId }, select: { orderNumber: true } }))?.orderNumber,
      message: msg,
      redirectPath: `/orders/${(await db.order.findUnique({ where: { id: attempt.orderId }, select: { orderNumber: true } }))?.orderNumber ?? ""}`,
    };
  }

  // ---- SUCCESS path: one atomic transaction ----
  const refNumber = verdict.refNumber;
  try {
    const result = await dbTx(async (tx) => {
      // 0) Atomic idempotency claim (M6): only ONE call can finalize.
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "PENDING" },
        data: {
          status: "SUCCESS",
          refNumber: refNumber ?? null,
          verifiedAt: new Date(),
          callbackAt: new Date(),
          message: "تراکنش نمایشی تایید شد — پول واقعی جابه‌جا نشده است.",
        },
      });
      if (claimed.count === 0) throw new AlreadyFinalizedError("PENDING");

      // 1) Load order + items + reservations.
      const order = await tx.order.findUnique({
        where: { id: attempt.orderId! },
        include: {
          items: true,
          reservations: true,
          discountCode: true,
        },
      });
      if (!order) throw new Error("order missing");

      // 2) Guarded stock decrement — never negative inventory (M5).
      for (const item of order.items) {
        const upd = await tx.artwork.updateMany({
          where: { id: item.artworkId, stock: { gte: item.quantity }, status: "PUBLISHED" },
          data: { stock: { decrement: item.quantity } },
        });
        if (upd.count === 0) throw new StockChangedError(item.titleSnapshot);
      }
      // 3) Reservations → CONVERTED.
      await tx.stockReservation.updateMany({
        where: { orderId: order.id, status: "ACTIVE" },
        data: { status: "CONVERTED" },
      });

      // 4) Invoice PAID.
      if (attempt.invoiceId) {
        const inv = await tx.invoice.findUnique({ where: { id: attempt.invoiceId }, select: { status: true } });
        if (inv) {
          assertTransition(INVOICE_MACHINE, "invoice", inv.status, "PAID");
          await tx.invoice.update({
            where: { id: attempt.invoiceId },
            data: { status: "PAID", paidAt: new Date() },
          });
        }
      }

      // 5) Seller sub-orders + ledger + platform revenue (C2C §۴.۵).
      const retentionDays = await getNumberSetting("RETENTION_DAYS");
      const bySeller = new Map<string, typeof order.items>();
      for (const it of order.items) {
        const list = bySeller.get(it.sellerId) ?? [];
        list.push(it);
        bySeller.set(it.sellerId, list);
      }
      const sellerIds = [...bySeller.keys()];
      const grosses = sellerIds.map((sid) =>
        bySeller.get(sid)!.reduce((s, i) => s + i.unitPrice * i.quantity, 0)
      );
      // Proportional discount allocation — exact sum via largest remainder.
      const discountShares = splitProportionally(order.discount, grosses);
      const shippingShares = splitProportionally(order.shipping, grosses);

      const sellers = await tx.user.findMany({
        where: { id: { in: sellerIds } },
        select: { id: true, shopTitle: true, name: true },
      });
      const sellerPlans = await effectivePlanForSellers(tx, sellerIds);

      let sellerIdx = 0;
      for (const sellerId of sellerIds) {
        const gross = grosses[sellerIdx];
        const discountShare = discountShares[sellerIdx];
        const shippingShare = shippingShares[sellerIdx];
        const net = gross - discountShare + shippingShare;
        const plan = sellerPlans.get(sellerId);
        const commission = applyBps(net, plan?.commissionBps ?? 1000);

        const so = await tx.sellerOrder.create({
          data: {
            orderId: order.id,
            sellerId,
            status: "PAID",
            gross,
            discountShare,
            net,
            commission,
            shippingShare,
            paidAt: new Date(),
          },
        });
        await tx.orderItem.updateMany({
          where: { id: { in: bySeller.get(sellerId)!.map((i) => i.id) } },
          data: { sellerOrderId: so.id },
        });

        // Ledger: SALE (pseudo-escrow: PENDING until delivered) + COMMISSION (−).
        await tx.ledgerEntry.create({
          data: {
            sellerId,
            sellerOrderId: so.id,
            orderId: order.id,
            kind: "SALE",
            amount: net,
            status: "PENDING",
            detail: `فروش اقلام سفارش ${order.orderNumber} (در انتظار تحویل)`,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            sellerId,
            sellerOrderId: so.id,
            orderId: order.id,
            kind: "COMMISSION",
            amount: -commission,
            status: "CLEARED",
            detail: `کارمزد فروش پلتفرم (${((plan?.commissionBps ?? 1000) / 100).toLocaleString("fa-IR")}٪) سفارش ${order.orderNumber}`,
          },
        });
        await tx.platformRevenueEntry.create({
          data: {
            kind: "COMMISSION",
            amount: commission,
            sellerId,
            orderId: order.id,
            sellerOrderId: so.id,
            detail: `کارمزد فروش سفارش ${order.orderNumber}`,
          },
        });

        await notify({
          userId: sellerId,
          type: "ORDER",
          title: "سفارش جدید ثبت شد",
          body: `سفارش ${order.orderNumber} پرداخت شد (نمایشی)؛ اقلام شما در صف آماده‌سازی است.`,
          link: `/dashboard/orders`,
        });
        sellerIdx += 1;
      }

      // 6) Order → PAID + timeline event.
      assertTransition(
        { PENDING_PAYMENT: ["PAID"] },
        "order",
        order.status,
        "PAID"
      );
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "PAYMENT",
          status: "PAID",
          detail: `پرداخت (نمایشی) تایید شد؛ شماره پیگیری درگاه: ${refNumber ?? "—"}`,
          actor: "درگاه نمایشی ریشه",
        },
      });

      // 7) Discount consumption — atomic guard `usedCount < maxUses` (S7).
      if (order.discount > 0 && order.discountCodeId && order.buyerId) {
        const codeRow = await tx.discountCode.findUnique({
          where: { id: order.discountCodeId },
          select: { maxUses: true, usedCount: true, perUserLimit: true },
        });
        let consumedGlobally = false;
        if (codeRow && codeRow.usedCount < codeRow.maxUses) {
          const guard = await tx.discountCode.updateMany({
            where: { id: order.discountCodeId, usedCount: { lt: codeRow.maxUses } },
            data: { usedCount: { increment: 1 } },
          });
          consumedGlobally = guard.count === 1;
        }
        if (consumedGlobally) {
          const claimedRow = await tx.discountRedemption.findFirst({
            where: { codeId: order.discountCodeId, userId: order.buyerId, status: "CLAIMED" },
            orderBy: { createdAt: "asc" },
          });
          if (claimedRow) {
            await tx.discountRedemption.update({
              where: { id: claimedRow.id },
              data: { status: "APPLIED" },
            });
          } else {
            const myUses = await tx.discountRedemption.count({
              where: { codeId: order.discountCodeId, userId: order.buyerId },
            });
            if (myUses < codeRow!.perUserLimit) {
              await tx.discountRedemption.create({
                data: { codeId: order.discountCodeId, userId: order.buyerId, status: "APPLIED" },
              });
            } else {
              // per-user limit exhausted between creation and payment:
              // roll the global counter back to stay consistent.
              await tx.discountCode.update({
                where: { id: order.discountCodeId },
                data: { usedCount: { decrement: 1 } },
              });
            }
          }
        }
      }

      // 8) Clear the buyer's cart (the order was created from it).
      await tx.cartItem.deleteMany({
        where: order.buyerId ? { userId: order.buyerId } : { guestKey: order.guestKey ?? "__none__" },
      });

      // 9) Buyer notification.
      if (order.buyerId) {
        await notify({
          userId: order.buyerId,
          type: "ORDER",
          title: "پرداخت سفارش با موفقیت تایید شد (نمایشی)",
          body: `سفارش ${order.orderNumber} در صف آماده‌سازی کارگاه‌ها قرار گرفت.`,
          link: `/orders/${order.orderNumber}`,
        });
      }

      // 10) Payment event + audit.
      await tx.paymentEvent.create({
        data: {
          paymentAttemptId: attempt.id,
          type: "VERIFY_SUCCESS",
          detail: "تایید نهایی پرداخت در تراکنش اتمیک",
          payload: JSON.stringify(verdict.raw ?? {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "payment-gateway",
          action: "PAYMENT_SUCCESS",
          target: order.orderNumber,
          detail: `${attempt.amount.toLocaleString("fa-IR")} تومان (نمایشی)`,
        },
      });

      return { orderNumber: order.orderNumber };
    }, { timeout: 30_000 });

    return {
      status: "SUCCESS",
      orderNumber: result.orderNumber,
      refNumber,
      message: "پرداخت نمایشی با موفقیت تایید شد (بدون انتقال پول واقعی).",
      redirectPath: `/orders/${result.orderNumber}`,
    };
  } catch (err) {
    if (err instanceof AlreadyFinalizedError) {
      const order = await db.order.findUnique({ where: { id: attempt.orderId }, select: { orderNumber: true } });
      return {
        status: "ALREADY",
        orderNumber: order?.orderNumber,
        refNumber,
        message: "این پرداخت پیش‌تر نهایی شده است (ضد تکرار).",
        redirectPath: order ? `/orders/${order.orderNumber}` : "/cart",
      };
    }
    if (err instanceof StockChangedError) {
      // Rollback happened atomically; now record the failure for the payer.
      const order = await db.order.findUnique({ where: { id: attempt.orderId }, select: { orderNumber: true } });
      const msg = `موجودی «${err.title}» پس از ثبت سفارش تغییر کرد؛ پرداخت نهایی نشد. سبد خود را بازبینی کنید.`;
      try {
        await failPaymentAttempt(attempt, "FAILED", msg);
      } catch {
        /* attempt may already be claimed by a parallel finalize — ignore */
      }
      return {
        status: "FAILED",
        orderNumber: order?.orderNumber,
        message: msg,
        redirectPath: "/cart",
      };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Invoice finalization (listing fee / subscription)
// ---------------------------------------------------------------------------

export async function finalizeInvoicePayment(authority: string): Promise<FinalizeResult> {
  const provider = getPaymentProvider();
  const attempt = await db.paymentAttempt.findUnique({
    where: { authority },
    include: { invoice: { include: { listing: { select: { title: true } } } } },
  });
  if (!attempt || !attempt.invoiceId || !attempt.invoice) {
    return { status: "FAILED", message: "شناسه پرداخت یافت نشد یا به فاکتوری متصل نیست.", redirectPath: "/dashboard" };
  }
  const invoice = attempt.invoice;

  if (attempt.status !== "PENDING") {
    return {
      status: "ALREADY",
      refNumber: attempt.refNumber ?? undefined,
      message: "این پرداخت پیش‌تر نهایی شده است (ضد تکرار).",
      redirectPath: invoice.kind === "SUBSCRIPTION" ? "/dashboard/plans" : "/dashboard/artworks",
    };
  }

  const verdict = await provider.verify({ authority, amount: attempt.amount });

  if (verdict.status !== "SUCCESS") {
    const msg =
      verdict.status === "CANCELED"
        ? "پرداخت لغو شد؛ می‌توانید بعداً دوباره تلاش کنید."
        : "پرداخت ناموفق بود؛ می‌توانید دوباره تلاش کنید.";
    await failPaymentAttempt(attempt, verdict.status === "CANCELED" ? "CANCELED" : "FAILED", msg);
    return {
      status: verdict.status,
      message: msg + " (نمایشی)",
      redirectPath: invoice.kind === "SUBSCRIPTION" ? "/dashboard/plans" : "/dashboard/artworks",
    };
  }

  try {
    const result = await dbTx(async (tx) => {
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "PENDING" },
        data: {
          status: "SUCCESS",
          refNumber: verdict.refNumber ?? null,
          verifiedAt: new Date(),
          callbackAt: new Date(),
          message: "تراکنش نمایشی تایید شد — پول واقعی جابه‌جا نشده است.",
        },
      });
      if (claimed.count === 0) throw new AlreadyFinalizedError("PENDING");

      assertTransition(INVOICE_MACHINE, "invoice", invoice.status, "PAID");
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: "PAID", paidAt: new Date() },
      });
      await tx.paymentEvent.create({
        data: {
          paymentAttemptId: attempt.id,
          type: "VERIFY_SUCCESS",
          detail: "تایید نهایی فاکتور در تراکنش اتمیک",
          payload: JSON.stringify(verdict.raw ?? {}),
        },
      });
      await tx.auditLog.create({
        data: {
          actor: "payment-gateway",
          action: "INVOICE_PAID",
          target: invoice.number,
          detail: `${invoice.kind} — ${invoice.amount.toLocaleString("fa-IR")} تومان (نمایشی)`,
        },
      });

      if (invoice.kind === "LISTING_FEE" && invoice.listingId) {
        // Listing fee paid → the artwork sits in PENDING_REVIEW for admin review.
        await tx.platformRevenueEntry.create({
          data: {
            kind: "LISTING_FEE",
            amount: invoice.amount,
            sellerId: invoice.payerId,
            invoiceId: invoice.id,
            detail: `کارمزد ثبت آگهی «${invoice.listing?.title ?? ""}»`,
          },
        });
        await notify({
          userId: invoice.payerId,
          type: "ARTWORK",
          title: "کارمزد ثبت آگهی پرداخت شد (نمایشی)",
          body: "اثر شما در صف بازبینی مدیریت قرار گرفت. نتیجه از طریق اعلان‌ها اعلام می‌شود.",
          link: "/dashboard/artworks",
        });
        return { path: "/dashboard/artworks" };
      }

      if (invoice.kind === "SUBSCRIPTION") {
        const sub = await tx.subscription.findUnique({ where: { invoiceId: invoice.id } });
        if (!sub) throw new Error("subscription missing");
        const plan = await tx.plan.findUniqueOrThrow({ where: { id: sub.planId } });
        // Extend from the current expiry when renewing the same plan tier.
        const now = new Date();
        const base = sub.startsAt.getTime() + plan.periodDays * 24 * 3600 * 1000 > now.getTime()
          ? sub.startsAt
          : now;
        // Simple documented policy: no prorating; the new plan starts now.
        const startsAt = now;
        const expiresAt = new Date(now.getTime() + plan.periodDays * 24 * 3600 * 1000);
        // Cancel any other ACTIVE subscription for this seller.
        await tx.subscription.updateMany({
          where: { sellerId: sub.sellerId, status: "ACTIVE", id: { not: sub.id } },
          data: { status: "CANCELED" },
        });
        await tx.subscription.update({
          where: { id: sub.id },
          data: { status: "ACTIVE", startsAt, expiresAt },
        });
        await tx.platformRevenueEntry.create({
          data: {
            kind: "SUBSCRIPTION",
            amount: invoice.amount,
            sellerId: sub.sellerId,
            invoiceId: invoice.id,
            detail: `اشتراک پلن ${plan.title}`,
          },
        });
        await notify({
          userId: sub.sellerId,
          type: "PLAN",
          title: "پلن شما فعال شد (نمایشی)",
          body: `پلن ${plan.title} با سقف ${plan.maxActiveListings === null ? "نامحدود" : plan.maxActiveListings + " آگهی فعال"} تا تاریخ جدید فعال است.`,
          link: "/dashboard/plans",
        });
        return { path: "/dashboard/plans" };
      }

      return { path: "/dashboard" };
    }, { timeout: 30_000 });

    return {
      status: "SUCCESS",
      refNumber: verdict.refNumber,
      message: "پرداخت فاکتور با موفقیت تایید شد (نمایشی).",
      redirectPath: result.path,
    };
  } catch (err) {
    if (err instanceof AlreadyFinalizedError) {
      return {
        status: "ALREADY",
        message: "این پرداخت پیش‌تر نهایی شده است (ضد تکرار).",
        redirectPath: invoice.kind === "SUBSCRIPTION" ? "/dashboard/plans" : "/dashboard/artworks",
      };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Effective plan resolution (server-side truth for caps & commission)
// ---------------------------------------------------------------------------

type TxLike = Prisma.TransactionClient | typeof db;

export type EffectivePlan = {
  planId: string;
  title: string;
  maxActiveListings: number | null;
  listingFeeToman: number;
  commissionBps: number;
  expiresAt: Date | null;
};

/** A seller ALWAYS has an effective plan: ACTIVE subscription or Free. */
export async function effectivePlanFor(tx: TxLike, sellerId: string): Promise<EffectivePlan> {
  const sub = await tx.subscription.findFirst({
    where: { sellerId, status: "ACTIVE", expiresAt: { gt: new Date() } },
    include: { plan: true },
    orderBy: { expiresAt: "desc" },
  });
  if (sub) {
    return {
      planId: sub.planId,
      title: sub.plan.title,
      maxActiveListings: sub.plan.maxActiveListings,
      listingFeeToman: sub.plan.listingFeeToman,
      commissionBps: sub.plan.commissionBps,
      expiresAt: sub.expiresAt,
    };
  }
  const free = await tx.plan.findUnique({ where: { id: "free" } });
  return {
    planId: free?.id ?? "free",
    title: free?.title ?? "رایگان",
    maxActiveListings: free?.maxActiveListings ?? 3,
    listingFeeToman: free?.listingFeeToman ?? 30000,
    commissionBps: free?.commissionBps ?? 1000,
    expiresAt: null,
  };
}

export async function effectivePlanForSellers(
  tx: Prisma.TransactionClient,
  sellerIds: string[]
): Promise<Map<string, EffectivePlan>> {
  const out = new Map<string, EffectivePlan>();
  for (const id of sellerIds) out.set(id, await effectivePlanFor(tx, id));
  return out;
}

export async function effectivePlan(sellerId: string): Promise<EffectivePlan> {
  return effectivePlanFor(db, sellerId);
}
