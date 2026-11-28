"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, dbTx } from "@/lib/db";
import { getCurrentUser, getGuestKey, ensureGuestKey } from "@/lib/session";
import { rateLimit, actionIp } from "@/lib/rate-limit";
import { getPaymentProvider } from "@/lib/payments";
import { availableStock } from "@/lib/payments/finalize";
import { evaluateDiscountForCheckout } from "@/lib/discount-engine";
import { assertTransition, ORDER_MACHINE, SELLER_ORDER_MACHINE, RETURN_MACHINE, deriveOrderStatus } from "@/lib/state-machines";
import type { OrderStatus } from "@prisma/client";
import { getNumberSetting } from "@/lib/settings";
import { uniqueOrderNumber, uniqueInvoiceNumber } from "@/lib/ids";
import { notify } from "@/lib/notify";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Orders — server-authoritative checkout (M5/M6/M7, C2C §۴.۴/§۴.۵).
 *
 * Rules enforced here (never on the client):
 *  - prices/totals recomputed from DB rows;
 *  - stock availability = physical stock − ACTIVE reservations (15-minute holds);
 *  - discount re-validated server-side, consumed atomically at finalize;
 *  - payment created through the PaymentProvider boundary and finalized ONLY
 *    by /api/payment/callback (see payments/finalize.ts);
 *  - every status change goes through the state machine + writes an OrderEvent.
 */

const addressSchema = z.object({
  buyerName: z.string().min(2, "نام گیرنده الزامی است").max(60),
  buyerPhone: z
    .string()
    .transform((v) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))
    .pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست (مثال: 09123456789)")),
  city: z.string().min(2, "شهر الزامی است").max(40),
  address: z.string().min(10, "نشانی کامل الزامی است").max(500),
  postalCode: z
    .string()
    .transform((v) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))
    .pipe(z.string().regex(/^\d{10}$/, "کد پستی باید ۱۰ رقم باشد"))
    .optional()
    .or(z.literal("")),
  note: z.string().max(300).optional().or(z.literal("")),
  shippingMethodId: z.string().min(1, "روش ارسال الزامی است"),
  // Optional checkout discount code (S7) — validated + recomputed server-side.
  discountCode: z.string().max(40).optional().or(z.literal("")),
  // Optional saved address id (address book, Phase 3)
  addressId: z.string().optional().or(z.literal("")),
});

export type CreateOrderResult =
  | {
      ok: true;
      orderNumber: string;
      redirectUrl: string; // gateway page (demo or real)
      amount: number;
      subtotal: number;
      discount: number;
      shipping: number;
      discountMessage?: string;
    }
  | { ok: false; error: string };

export async function createOrderAction(
  input: z.input<typeof addressSchema>
): Promise<CreateOrderResult> {
  const ip = actionIp();
  if (!(await rateLimit(`checkout|${ip}`, 12, 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }

  const user = await getCurrentUser();
  const guestKey = await ensureGuestKey();
  const cartItems = await db.cartItem.findMany({
    where: user ? { userId: user.id } : { guestKey },
    include: { artwork: { include: { seller: true } } },
  });
  if (cartItems.length === 0) {
    return { ok: false, error: "سبد خرید شما خالی است." };
  }

  // Shipping method lives in the DB (no hardcoded prices).
  const shippingMethod = await db.shippingMethod.findFirst({
    where: { id: parsed.data.shippingMethodId, active: true },
  });
  if (!shippingMethod) {
    return { ok: false, error: "روش ارسال انتخابی معتبر نیست." };
  }

  // Server-side price & availability validation (reservations-aware).
  let subtotal = 0;
  for (const item of cartItems) {
    const aw = item.artwork;
    if (aw.status !== "PUBLISHED") {
      return { ok: false, error: `اثر «${aw.title}» دیگر در دسترس خرید نیست.` };
    }
    const available = await availableStock(aw.id);
    if (available < item.quantity) {
      return {
        ok: false,
        error: `موجودی «${aw.title}» کافی نیست؛ تنها ${available} نسخه باقی است.`,
      };
    }
    subtotal += aw.price * item.quantity;
  }

  // Discount (S7): validated + recomputed from the database, never from the client.
  let discount = 0;
  let discountCodeId: string | undefined;
  let discountMessage: string | undefined;
  if (user && parsed.data.discountCode?.trim()) {
    const applied = await evaluateDiscountForCheckout(parsed.data.discountCode, user, subtotal);
    if (applied.ok) {
      discount = applied.discount;
      discountCodeId = applied.code.id;
      discountMessage = applied.message;
    } else {
      return { ok: false, error: `کد تخفیف اعمال نشد: ${applied.message}` };
    }
  }

  const shipping = shippingMethod.priceToman;
  const total = Math.max(0, subtotal - discount) + shipping;
  const orderNumber = await uniqueOrderNumber();
  const reservationMinutes = await getNumberSetting("RESERVATION_MINUTES");

  // Provider handshake FIRST (server-issued authority), then persist atomically.
  const provider = getPaymentProvider();
  let authority: string;
  try {
    const req = await provider.request({
      invoiceOrOrderId: orderNumber,
      amount: total,
      callbackUrl: "/api/payment/callback",
      description: `پرداخت سفارش ${orderNumber}`,
    });
    authority = req.authority;
  } catch {
    return { ok: false, error: "اتصال به درگاه پرداخت ناموفق بود؛ کمی بعد تلاش کنید." };
  }

  try {
    await dbTx(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber,
          buyerId: user?.id ?? null,
          guestKey: user ? null : guestKey,
          buyerName: parsed.data.buyerName.trim(),
          buyerPhone: parsed.data.buyerPhone,
          city: parsed.data.city.trim(),
          address: parsed.data.address.trim(),
          postalCode: parsed.data.postalCode || null,
          note: parsed.data.note || null,
          shippingMethodId: shippingMethod.id,
          subtotal,
          discount,
          discountCodeId: discount ? discountCodeId : null,
          shipping,
          total,
          status: "PENDING_PAYMENT",
          items: {
            create: cartItems.map((item) => ({
              artworkId: item.artworkId,
              titleSnapshot: item.artwork.title,
              imageSnapshot: (JSON.parse(item.artwork.images || "[]") as string[])[0] ?? "",
              unitPrice: item.artwork.price, // server-verified price
              quantity: item.quantity,
              sellerId: item.artwork.sellerId,
            })),
          },
        },
      });

      // 15-minute stock holds (Phase 1 §۴).
      await tx.stockReservation.createMany({
        data: cartItems.map((item) => ({
          orderId: order.id,
          artworkId: item.artworkId,
          quantity: item.quantity,
          expiresAt: new Date(Date.now() + reservationMinutes * 60_000),
        })),
      });

      const invoice = await tx.invoice.create({
        data: {
          number: await uniqueInvoiceNumber(),
          payerId: user?.id ?? (await tx.user.findFirst({ where: { role: "ADMIN" }, select: { id: true } }))!.id,
          kind: "ORDER",
          status: "PENDING",
          amount: total,
          description: `پرداخت سفارش ${orderNumber} (نمایشی)`,
          orderId: order.id,
        },
      });

      await tx.paymentAttempt.create({
        data: {
          invoiceId: invoice.id,
          orderId: order.id,
          provider: provider.name,
          authority,
          amount: total,
          status: "PENDING",
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: order.id,
          type: "STATUS",
          status: "PENDING_PAYMENT",
          detail: "سفارش ثبت شد؛ موجودی ۱۵ دقیقه برای شما رزرو شد. در انتظار تکمیل پرداخت.",
          actor: "سامانه",
        },
      });
    }, { timeout: 30_000 });
  } catch (err) {
    console.error("[orders] create failed:", err);
    return { ok: false, error: "ثبت سفارش ناموفق بود؛ دوباره تلاش کنید." };
  }

  revalidatePath("/cart");
  return {
    ok: true,
    orderNumber,
    redirectUrl: `/pay/demo/${encodeURIComponent(authority)}`,
    amount: total,
    subtotal,
    discount,
    shipping,
    discountMessage,
  };
}

// ---------------------------------------------------------------------------
// Retry payment for a failed/canceled attempt (same order, new authority)
// ---------------------------------------------------------------------------

export async function retryOrderPaymentAction(orderNumber: string): Promise<CreateOrderResult> {
  if (!(await rateLimit(`retry-pay|${actionIp()}`, 10, 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, reservations: true },
  });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };
  const mine = user ? order.buyerId === user.id : Boolean(guestKey && order.guestKey === guestKey);
  if (!mine && user?.role !== "ADMIN") return { ok: false, error: "این سفارش متعلق به شما نیست." };
  if (order.status !== "PENDING_PAYMENT" && order.status !== "PAYMENT_FAILED") {
    return { ok: false, error: "این سفارش در وضعیت قابل پرداخت نیست." };
  }
  // Re-check availability before retry.
  for (const item of order.items) {
    const available = await availableStock(item.artworkId);
    if (available < item.quantity) {
      return { ok: false, error: `موجودی «${item.titleSnapshot}» کافی نیست؛ سفارش را دوباره ثبت کنید.` };
    }
  }
  // Extend reservations for another window.
  const reservationMinutes = await getNumberSetting("RESERVATION_MINUTES");
  await db.stockReservation.updateMany({
    where: { orderId: order.id, status: { in: ["RELEASED", "EXPIRED"] } },
    data: { status: "ACTIVE", expiresAt: new Date(Date.now() + reservationMinutes * 60_000), releasedAt: null },
  });
  if (order.status === "PAYMENT_FAILED") {
    await db.order.update({ where: { id: order.id }, data: { status: "PENDING_PAYMENT" } });
    await db.orderEvent.create({
      data: { orderId: order.id, type: "STATUS", status: "PENDING_PAYMENT", detail: "خریدار برای پرداخت دوباره تلاش کرد.", actor: "سامانه" },
    });
  }

  const provider = getPaymentProvider();
  let authority: string;
  try {
    const req = await provider.request({
      invoiceOrOrderId: order.orderNumber,
      amount: order.total,
      callbackUrl: "/api/payment/callback",
      description: `پرداخت سفارش ${order.orderNumber}`,
    });
    authority = req.authority;
  } catch {
    return { ok: false, error: "اتصال به درگاه پرداخت ناموفق بود؛ کمی بعد تلاش کنید." };
  }
  await db.paymentAttempt.create({
    data: {
      invoiceId: (await db.invoice.findFirst({ where: { orderId: order.id, kind: "ORDER" }, select: { id: true } }))?.id,
      orderId: order.id,
      provider: provider.name,
      authority,
      amount: order.total,
      status: "PENDING",
    },
  });
  return {
    ok: true,
    orderNumber: order.orderNumber,
    redirectUrl: `/pay/demo/${encodeURIComponent(authority)}`,
    amount: order.total,
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
  };
}

// ---------------------------------------------------------------------------
// Seller sub-order transitions (M7) — per-seller, machine-guarded, escrow-aware
// ---------------------------------------------------------------------------

const sellerStatusSchema = z.object({
  sellerOrderId: z.string().min(1),
  status: z.enum(["PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  detail: z.string().max(300).optional().or(z.literal("")),
});

export async function updateSellerOrderStatusAction(
  input: z.input<typeof sellerStatusSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const parsed = sellerStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ورودی نامعتبر است." };

  const so = await db.sellerOrder.findUnique({
    where: { id: parsed.data.sellerOrderId },
    include: { order: { include: { items: true } }, items: true, ledgerEntries: true },
  });
  if (!so) return { ok: false, error: "زیرسفارش یافت نشد." };

  // Server-side authorization: the seller of THIS sub-order or admin only.
  if (so.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مجوز تغییر وضعیت این سفارش را ندارید." };
  }
  // A waiting-approval artisan cannot run fulfilment.
  if (user.role === "ARTISAN") {
    const mr = await db.memberRequest.findUnique({ where: { userId: user.id } });
    if (mr?.status === "PENDING") {
      return { ok: false, error: "تا تایید عضویت شما توسط مدیریت، امکان تغییر وضعیت سفارش وجود ندارد." };
    }
  }

  assertTransition(SELLER_ORDER_MACHINE, "seller-order", so.status, parsed.data.status);

  const retentionDays = await getNumberSetting("RETENTION_DAYS");
  const now = new Date();

  await dbTx(async (tx) => {
    await tx.sellerOrder.update({
      where: { id: so.id },
      data: {
        status: parsed.data.status,
        ...(parsed.data.status === "PREPARING" ? { preparedAt: now } : {}),
        ...(parsed.data.status === "SHIPPED" ? { shippedAt: now } : {}),
        ...(parsed.data.status === "DELIVERED" ? { deliveredAt: now } : {}),
        ...(parsed.data.status === "CANCELLED" ? { cancelledAt: now } : {}),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: so.orderId,
        sellerOrderId: so.id,
        type: "STATUS",
        status: parsed.data.status,
        detail:
          parsed.data.detail ||
          {
            PREPARING: "سفارش در کارگاه در حال آماده‌سازی و بسته‌بندی است.",
            SHIPPED: "مرسول به شرکت حمل تحویل داده شد (بدون کد رهگیری زنده).",
            DELIVERED: "مرسول با موفقیت به خریدار تحویل داده شد.",
            CANCELLED: "این بخش از سفارش لغو شد.",
          }[parsed.data.status],
        actor: user.role === "ADMIN" ? "مدیریت ریشه" : user.shopTitle || user.name,
      },
    });

    if (parsed.data.status === "DELIVERED") {
      // Ledger: escrow step 2 — PENDING → HOLDING with availableAt = now + retention.
      await tx.ledgerEntry.updateMany({
        where: { sellerOrderId: so.id, kind: "SALE", status: "PENDING" },
        data: {
          status: "HOLDING",
          availableAt: new Date(now.getTime() + retentionDays * 24 * 3600 * 1000),
          detail: `فروش اقلام سفارش ${so.order.orderNumber} (در دوره نگهداری ${retentionDays} روزه)`,
        },
      });
      // Bug fix: SOLD only when stock is truly exhausted (stock === 0).
      for (const item of so.items) {
        await tx.artwork.updateMany({
          where: { id: item.artworkId, stock: 0 },
          data: { status: "SOLD" },
        });
      }
      if (so.order.buyerId) {
        await notify({
          userId: so.order.buyerId,
          type: "ORDER",
          title: "سفارش شما تحویل شد",
          body: `بخش مربوط به «${user.shopTitle || user.name}» از سفارش ${so.order.orderNumber} تحویل شد. تجربه خرید خود را با ثبت نظر به اشتراک بگذارید.`,
          link: `/orders/${so.order.orderNumber}`,
        });
      }
    }

    if (parsed.data.status === "CANCELLED") {
      // Restore stock for this sub-order's items and reverse its ledger entries.
      for (const item of so.items) {
        await tx.artwork.updateMany({
          where: { id: item.artworkId },
          data: { stock: { increment: item.quantity } },
        });
      }
      for (const entry of so.ledgerEntries) {
        await tx.ledgerEntry.create({
          data: {
            sellerId: entry.sellerId,
            sellerOrderId: entry.sellerOrderId,
            orderId: entry.orderId,
            kind: entry.kind,
            amount: -entry.amount,
            status: "CLEARED",
            detail: `ابطال قلم «${entry.detail ?? entry.kind}» به‌دلیل لغو بخش ${so.id.slice(-6)} سفارش ${so.order.orderNumber}`,
          },
        });
      }
      if (so.order.buyerId) {
        await notify({
          userId: so.order.buyerId,
          type: "ORDER",
          title: "بخشی از سفارش شما لغو شد",
          body: `بخش مربوط به «${user.shopTitle || user.name}» از سفارش ${so.order.orderNumber} لغو و مبلغ آن بازگشت داده شد (نمایشی).`,
          link: `/orders/${so.order.orderNumber}`,
        });
      }
    }

    // Derive the parent order status from its sub-orders (§۴.۴).
    const siblings = await tx.sellerOrder.findMany({
      where: { orderId: so.orderId },
      select: { status: true },
    });
    const nextOrderStatus = deriveOrderStatus(siblings.map((s) => s.status), so.order.status);
    const parent = await tx.order.findUnique({ where: { id: so.orderId }, select: { status: true } });
    if (parent && parent.status !== nextOrderStatus) {
      assertTransition(ORDER_MACHINE, "order", parent.status, nextOrderStatus);
      await tx.order.update({ where: { id: so.orderId }, data: { status: nextOrderStatus as OrderStatus } });
      await tx.orderEvent.create({
        data: {
          orderId: so.orderId,
          type: "STATUS",
          status: nextOrderStatus,
          detail: `وضعیت کلی سفارش بر اساس زیرسفارش‌ها به «${nextOrderStatus}» به‌روزرسانی شد.`,
          actor: "سامانه",
        },
      });
    }

    await tx.auditLog.create({
      data: {
        actor: user.email,
        action: "SELLER_ORDER_STATUS",
        target: so.order.orderNumber,
        detail: `${so.id.slice(-6)} → ${parsed.data.status}`,
      },
    });
  }, { timeout: 30_000 });

  revalidatePath("/orders");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, message: "وضعیت به‌روزرسانی شد." };
}

// ---------------------------------------------------------------------------
// Buyer confirm delivery — escrow step is already done at seller DELIVERED;
// confirming is the buyer's receipt acknowledgment.
// ---------------------------------------------------------------------------

export async function confirmDeliveryAction(sellerOrderId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const so = await db.sellerOrder.findUnique({ where: { id: sellerOrderId }, include: { order: true } });
  if (!so) return { ok: false, error: "زیرسفارش یافت نشد." };
  if (so.order.buyerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "این سفارش متعلق به شما نیست." };
  }
  assertTransition(SELLER_ORDER_MACHINE, "seller-order", so.status, "DELIVERED");
  const now = new Date();
  const retentionDays = await getNumberSetting("RETENTION_DAYS");
  await dbTx(async (tx) => {
    await tx.sellerOrder.update({
      where: { id: so.id },
      data: { status: "DELIVERED", deliveredAt: now },
    });
    await tx.ledgerEntry.updateMany({
      where: { sellerOrderId: so.id, kind: "SALE", status: "PENDING" },
      data: {
        status: "HOLDING",
        availableAt: new Date(now.getTime() + retentionDays * 24 * 3600 * 1000),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: so.orderId,
        sellerOrderId: so.id,
        type: "STATUS",
        status: "DELIVERED",
        detail: "خریدار تحویل را تایید کرد.",
        actor: user.name,
      },
    });
    await notify({
      userId: so.sellerId,
      type: "ORDER",
      title: "تحویل سفارش تایید شد",
      body: `خریدار تحویل بخش شما از سفارش ${so.order.orderNumber} را تایید کرد؛ وجه پس از دوره نگهداری قابل تسویه می‌شود.`,
      link: "/dashboard/orders",
    });
  });
  revalidatePath("/orders");
  revalidatePath("/dashboard");
  return { ok: true, message: "تحویل تایید شد. سپاس از خرید شما." };
}

// ---------------------------------------------------------------------------
// Buyer cancel (only before payment) — releases reservations
// ---------------------------------------------------------------------------

export async function cancelPendingOrderAction(orderNumber: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  const order = await db.order.findUnique({ where: { orderNumber } });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };
  const mine = user ? order.buyerId === user.id : Boolean(guestKey && order.guestKey === guestKey);
  if (!mine) return { ok: false, error: "این سفارش متعلق به شما نیست." };
  assertTransition(ORDER_MACHINE, "order", order.status, "CANCELLED");
  await dbTx(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: "CANCELLED" } });
    await tx.stockReservation.updateMany({
      where: { orderId: order.id, status: "ACTIVE" },
      data: { status: "RELEASED", releasedAt: new Date() },
    });
    await tx.paymentAttempt.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "CANCELED", verifiedAt: new Date(), message: "سفارش پیش از پرداخت توسط خریدار لغو شد." },
    });
    await tx.invoice.updateMany({
      where: { orderId: order.id, status: "PENDING" },
      data: { status: "CANCELED" },
    });
    await tx.orderEvent.create({
      data: { orderId: order.id, type: "STATUS", status: "CANCELLED", detail: "سفارش پیش از پرداخت توسط خریدار لغو شد.", actor: user?.name ?? "مهمان" },
    });
  });
  revalidatePath("/orders");
  return { ok: true, message: "سفارش لغو شد." };
}

// ---------------------------------------------------------------------------
// Returns (مرجوعی) with ledger reversal
// ---------------------------------------------------------------------------

const returnSchema = z.object({
  orderItemId: z.string().min(1),
  reason: z.string().min(3, "دلیل مرجوعی الزامی است").max(200),
  detail: z.string().max(600).optional().or(z.literal("")),
});

export async function requestReturnAction(input: z.input<typeof returnSchema>): Promise<ActionResult> {
  if (!(await rateLimit(`return|${actionIp()}`, 8, 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const parsed = returnSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };

  const item = await db.orderItem.findUnique({
    where: { id: parsed.data.orderItemId },
    include: { order: true, sellerOrder: true },
  });
  if (!item) return { ok: false, error: "قلم سفارش یافت نشد." };
  if (item.order.buyerId !== user.id) return { ok: false, error: "این سفارش متعلق به شما نیست." };
  if (item.order.status !== "DELIVERED") {
    return { ok: false, error: "درخواست مرجوعی تنها پس از تحویل سفارش امکان‌پذیر است." };
  }
  if (item.sellerOrder?.status !== "DELIVERED") {
    return { ok: false, error: "بخش مربوط به این فروشنده هنوز در وضعیت تحویل‌شده نیست." };
  }
  const existing = await db.returnRequest.findFirst({ where: { orderItemId: item.id, status: { notIn: ["REJECTED"] } } });
  if (existing) return { ok: false, error: "برای این قلم یک درخواست مرجوعی فعال وجود دارد." };

  await db.returnRequest.create({
    data: {
      orderItemId: item.id,
      sellerOrderId: item.sellerOrderId,
      buyerId: user.id,
      reason: parsed.data.reason.trim(),
      detail: parsed.data.detail || null,
      status: "PENDING",
    },
  });
  await db.orderEvent.create({
    data: {
      orderId: item.orderId,
      sellerOrderId: item.sellerOrderId,
      type: "RETURN",
      status: "PENDING",
      detail: `درخواست مرجوعی «${item.titleSnapshot}» ثبت شد: ${parsed.data.reason}`,
      actor: user.name,
    },
  });
  await notify({
    userId: item.sellerId,
    type: "ORDER",
    title: "درخواست مرجوعی جدید",
    body: `برای «${item.titleSnapshot}» در سفارش ${item.order.orderNumber} درخواست مرجوعی ثبت شد.`,
    link: "/dashboard/orders",
  });
  revalidatePath("/orders");
  return { ok: true, message: "درخواست مرجوعی ثبت شد و پس از بررسی مدیریت/فروشنده نتیجه اعلام می‌شود." };
}

const returnDecisionSchema = z.object({
  returnId: z.string().min(1),
  decision: z.enum(["APPROVED", "REJECTED", "RECEIVED", "REFUNDED"]),
  note: z.string().max(300).optional().or(z.literal("")),
});

export async function decideReturnAction(input: z.input<typeof returnDecisionSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ADMIN") return { ok: false, error: "این عملیات فقط برای مدیریت ریشه است." };
  const parsed = returnDecisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ورودی نامعتبر است." };

  const rr = await db.returnRequest.findUnique({
    where: { id: parsed.data.returnId },
    include: { item: { include: { order: true } } },
  });
  if (!rr) return { ok: false, error: "درخواست مرجوعی یافت نشد." };
  assertTransition(RETURN_MACHINE, "return", rr.status, parsed.data.decision);

  await dbTx(async (tx) => {
    await tx.returnRequest.update({
      where: { id: rr.id },
      data: {
        status: parsed.data.decision,
        resolution: parsed.data.note || null,
        decidedAt: new Date(),
        ...(parsed.data.decision === "REFUNDED" ? { refundedAt: new Date() } : {}),
      },
    });
    await tx.orderEvent.create({
      data: {
        orderId: rr.item.orderId,
        sellerOrderId: rr.sellerOrderId,
        type: "RETURN",
        status: parsed.data.decision,
        detail: `وضعیت مرجوعی «${rr.item.titleSnapshot}»: ${parsed.data.decision}`,
        actor: "مدیریت ریشه",
      },
    });

    if (parsed.data.decision === "REFUNDED") {
      // Reverse this item's share of the seller sub-order ledger + restore stock.
      const so = rr.sellerOrderId
        ? await tx.sellerOrder.findUnique({ where: { id: rr.sellerOrderId }, include: { ledgerEntries: true } })
        : null;
      if (so) {
        const itemGross = rr.item.unitPrice * rr.item.quantity;
        const soGross = so.gross || 1;
        const share = Math.floor((itemGross * (so.net - 0)) / soGross);
        const commissionShare = Math.floor((share * so.commission) / Math.max(1, so.net));
        await tx.ledgerEntry.create({
          data: {
            sellerId: so.sellerId,
            sellerOrderId: so.id,
            orderId: so.orderId,
            kind: "ADJUSTMENT",
            amount: -share,
            status: "CLEARED",
            detail: `بازگشت وجه مرجوعی «${rr.item.titleSnapshot}» سفارش ${rr.item.order.orderNumber} (نمایشی)`,
          },
        });
        await tx.ledgerEntry.create({
          data: {
            sellerId: so.sellerId,
            sellerOrderId: so.id,
            orderId: so.orderId,
            kind: "ADJUSTMENT",
            amount: commissionShare,
            status: "CLEARED",
            detail: `بازگشت کارمزد بخش مرجوع‌شده سفارش ${rr.item.order.orderNumber} (نمایشی)`,
          },
        });
        await tx.platformRevenueEntry.create({
          data: {
            kind: "COMMISSION",
            amount: -commissionShare,
            sellerId: so.sellerId,
            orderId: so.orderId,
            sellerOrderId: so.id,
            detail: `کاهش کارمزد به‌دلیل مرجوعی سفارش ${rr.item.order.orderNumber}`,
          },
        });
      }
      await tx.artwork.updateMany({
        where: { id: rr.item.artworkId },
        data: { stock: { increment: rr.item.quantity } },
      });
      await notify({
        userId: rr.buyerId,
        type: "ORDER",
        title: "مبلغ مرجوعی بازگشت داده شد (نمایشی)",
        body: `مبلغ «${rr.item.titleSnapshot}» به حساب شما بازگشت داده شد (شبیه‌سازی).`,
        link: `/orders/${rr.item.order.orderNumber}`,
      });
    }
    await tx.auditLog.create({
      data: { actor: user.email, action: "RETURN_DECISION", target: rr.id, detail: parsed.data.decision },
    });
  }, { timeout: 30_000 });

  revalidatePath("/admin");
  revalidatePath("/orders");
  return { ok: true, message: "وضعیت مرجوعی به‌روزرسانی شد." };
}

// ---------------------------------------------------------------------------
// Guest order tracking (orderNumber + phone, rate-limited; no OTP — Won't)
// ---------------------------------------------------------------------------

const trackSchema = z.object({
  orderNumber: z.string().min(6).max(40),
  phone: z
    .string()
    .transform((v) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))))
    .pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست")),
});

export type GuestTrackResult =
  | {
      ok: true;
      order: {
        orderNumber: string;
        status: string;
        createdAt: string;
        total: number;
        items: Array<{ title: string; quantity: number; image: string; sellerId: string }>;
        events: Array<{ type: string; status?: string; detail?: string; actor: string; createdAt: string }>;
      };
    }
  | { ok: false; error: string };

export async function trackGuestOrderAction(input: z.input<typeof trackSchema>): Promise<GuestTrackResult> {
  const ip = actionIp();
  if (!(await rateLimit(`track|${ip}`, 10, 60_000))) {
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." };
  }
  const parsed = trackSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };

  const order = await db.order.findUnique({
    where: { orderNumber: parsed.data.orderNumber.trim() },
    include: { items: true, events: { orderBy: { createdAt: "asc" } } },
  });
  // Same generic message for "not found" and "wrong phone" — no enumeration.
  if (!order || order.buyerPhone !== parsed.data.phone) {
    return { ok: false, error: "سفارشی با این شماره سفارش و شماره موبایل یافت نشد." };
  }
  return {
    ok: true,
    order: {
      orderNumber: order.orderNumber,
      status: order.status,
      createdAt: order.createdAt.toISOString(),
      total: order.total,
      items: order.items.map((i) => ({
        title: i.titleSnapshot,
        quantity: i.quantity,
        image: i.imageSnapshot,
        sellerId: i.sellerId,
      })),
      events: order.events.map((e) => ({
        type: e.type,
        status: e.status ?? undefined,
        detail: e.detail ?? undefined,
        actor: e.actor,
        createdAt: e.createdAt.toISOString(),
      })),
    },
  };
}
