"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, getGuestKey, rateLimit } from "@/lib/session";
import { invalidatePublicCatalog } from "@/lib/data";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * DEMO PAYMENT ADAPTER — clearly labeled simulation.
 * No real bank gateway is configured (see docs/DEPLOYMENT.md).
 * The payment result is produced by this server-side adapter only after
 * a server-issued `authority` is verified; a client redirect or query
 * parameter alone is never treated as proof of payment.
 */

const SHIPPING_METHODS: Record<string, number> = {
  free: 0, // ارسال رایگان بیمه‌شده ریشه
  courier: 50000, // پیک اختصاصی و بیمه‌شده ریشه
  tipax: 75000, // ارسال سریع تیپاکس سراسری
};

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
  shippingMethod: z.enum(["free", "courier", "tipax"]).default("free"),
});

export type CreateOrderResult =
  | { ok: true; orderNumber: string; authority: string; amount: number }
  | { ok: false; error: string };

export async function createOrderAction(
  input: z.input<typeof addressSchema>
): Promise<CreateOrderResult> {
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }

  const user = await getCurrentUser();
  const guestKey = await getGuestKey();
  const cartItems = await db.cartItem.findMany({
    where: user ? { userId: user.id } : { guestKey: guestKey ?? "__none__" },
    include: { artwork: { include: { seller: true } } },
  });

  if (cartItems.length === 0) {
    return { ok: false, error: "سبد خرید شما خالی است." };
  }

  // Server-side price & stock validation — never trust client totals
  let subtotal = 0;
  for (const item of cartItems) {
    const aw = item.artwork;
    if (aw.status !== "PUBLISHED") {
      return { ok: false, error: `اثر «${aw.title}» دیگر در دسترس خرید نیست.` };
    }
    if (aw.stock < item.quantity) {
      return { ok: false, error: `موجودی «${aw.title}» کافی نیست؛ تنها ${aw.stock} نسخه باقی است.` };
    }
    subtotal += aw.price * item.quantity;
  }

  const orderNumber = `RSH-ORD-${Date.now().toString().slice(-8)}`;
  const authority = `DEMO-${randomBytes(12).toString("hex")}`;
  const shipping = SHIPPING_METHODS[parsed.data.shippingMethod] ?? 0;
  const total = subtotal + shipping;

  const order = await db.order.create({
    data: {
      orderNumber,
      buyerId: user?.id ?? null,
      buyerName: parsed.data.buyerName.trim(),
      buyerPhone: parsed.data.buyerPhone,
      city: parsed.data.city.trim(),
      address: parsed.data.address.trim(),
      postalCode: parsed.data.postalCode || null,
      note: parsed.data.note || null,
      subtotal,
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
      payments: {
        create: {
          gateway: "DEMO",
          authority,
          amount: total,
          status: "PENDING",
        },
      },
      tracking: {
        create: {
          status: "PENDING_PAYMENT",
          detail: "سفارش ثبت شد؛ در انتظار تکمیل پرداخت.",
          actor: "سامانه",
        },
      },
    },
  });

  return { ok: true, orderNumber, authority, amount: total };
}

const verifySchema = z.object({
  authority: z.string().min(6),
  outcome: z.enum(["SUCCESS", "FAILED", "CANCELLED"]),
});

export type VerifyPaymentResult =
  | { ok: true; status: "SUCCESS" | "FAILED" | "CANCELLED"; orderNumber: string; refNumber?: string; message: string }
  | { ok: false; error: string };

export async function verifyDemoPaymentAction(
  input: z.input<typeof verifySchema>
): Promise<VerifyPaymentResult> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "پارامترهای پرداخت نامعتبر است." };

  const payment = await db.paymentAttempt.findUnique({
    where: { authority: parsed.data.authority },
    include: { order: { include: { items: true } } },
  });
  if (!payment) return { ok: false, error: "شناسه پرداخت یافت نشد." };
  if (payment.status !== "PENDING") {
    return { ok: false, error: "این تراکنش قبلاً نهایی شده است." };
  }

  // Idempotency: mark first, act after
  const outcome = parsed.data.outcome;
  const refNumber =
    outcome === "SUCCESS" ? `DEMO-REF-${randomBytes(5).toString("hex").toUpperCase()}` : undefined;

  await db.paymentAttempt.update({
    where: { id: payment.id },
    data: {
      status: outcome,
      refNumber: refNumber ?? null,
      verifiedAt: new Date(),
      message:
        outcome === "SUCCESS"
          ? "تراکنش نمایشی تایید شد — پول واقعی جابه‌جا نشده است."
          : outcome === "FAILED"
            ? "تراکنش نمایشی ناموفق بود (شبیه‌سازی خطای درگاه)."
            : "پرداخت نمایشی توسط کاربر لغو شد.",
    },
  });

  if (outcome === "SUCCESS") {
    // Decrement stock, mark artworks, advance order, write ledger, clear cart
    await db.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
    await db.trackingEvent.create({
      data: {
        orderId: payment.orderId,
        status: "PAID",
        detail: "پرداخت (نمایشی) تایید شد؛ سفارش در صف آماده‌سازی کارگاه قرار گرفت.",
        actor: "درگاه نمایشی ریشه",
      },
    });
    for (const item of payment.order.items) {
      await db.artwork.update({
        where: { id: item.artworkId },
        data: { stock: { decrement: item.quantity } },
      });
      await db.ledgerEntry.create({
        data: {
          sellerId: item.sellerId,
          orderId: payment.orderId,
          kind: "SALE",
          amount: item.unitPrice * item.quantity,
          detail: `فروش «${item.titleSnapshot}» — سفارش ${payment.order.orderNumber}`,
          status: "CLEARED",
        },
      });
      const commission = Math.round(item.unitPrice * item.quantity * 0.1);
      await db.ledgerEntry.create({
        data: {
          sellerId: item.sellerId,
          orderId: payment.orderId,
          kind: "COMMISSION",
          amount: -commission,
          detail: `کارمزد پلتفرم (۱۰٪) سفارش ${payment.order.orderNumber}`,
          status: "CLEARED",
        },
      });
    }
    // Successful checkout clears the buyer's cart (order was created from it)
    const sessionUser = await getCurrentUser();
    const guestKey = await getGuestKey();
    await db.cartItem.deleteMany({
      where: sessionUser ? { userId: sessionUser.id } : { guestKey: guestKey ?? "__none__" },
    });
  } else {
    await db.order.update({
      where: { id: payment.orderId },
      data: { status: outcome === "CANCELLED" ? "CANCELLED" : "PAYMENT_FAILED" },
    });
    await db.trackingEvent.create({
      data: {
        orderId: payment.orderId,
        status: outcome,
        detail:
          outcome === "CANCELLED"
            ? "پرداخت لغو شد؛ سبد خرید شما حفظ شده است."
            : "پرداخت ناموفق؛ می‌توانید دوباره تلاش کنید.",
        actor: "درگاه نمایشی ریشه",
      },
    });
  }

  invalidatePublicCatalog(); // stock changed on payment
  revalidatePath("/");
  return {
    ok: true,
    status: outcome,
    orderNumber: payment.order.orderNumber,
    refNumber,
    message:
      outcome === "SUCCESS"
        ? "پرداخت نمایشی با موفقیت تایید شد (بدون انتقال پول واقعی)."
        : outcome === "FAILED"
          ? "پرداخت نمایشی ناموفق بود."
          : "پرداخت لغو شد.",
  };
}

const statusSchema = z.object({
  orderId: z.string().min(1),
  status: z.enum(["PREPARING", "SHIPPED", "DELIVERED", "CANCELLED"]),
  detail: z.string().max(300).optional().or(z.literal("")),
});

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
  PAYMENT_FAILED: [],
  PENDING_PAYMENT: [],
};

export async function updateOrderStatusAction(
  input: z.input<typeof statusSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const parsed = statusSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ورودی نامعتبر است." };

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { items: true },
  });
  if (!order) return { ok: false, error: "سفارش یافت نشد." };

  // Server-side authorization: seller of items or admin
  const isSellerOfItems = order.items.some((i) => i.sellerId === user.id);
  if (!isSellerOfItems && user.role !== "ADMIN") {
    return { ok: false, error: "شما مجوز تغییر وضعیت این سفارش را ندارید." };
  }

  const allowed = ALLOWED_TRANSITIONS[order.status] ?? [];
  if (!allowed.includes(parsed.data.status)) {
    return { ok: false, error: "گذار وضعیت برای این سفارش مجاز نیست." };
  }

  await db.order.update({
    where: { id: order.id },
    data: { status: parsed.data.status },
  });
  await db.trackingEvent.create({
    data: {
      orderId: order.id,
      status: parsed.data.status,
      detail:
        parsed.data.detail ||
        {
          PREPARING: "سفارش در کارگاه در حال آماده‌سازی و بسته‌بندی است.",
          SHIPPED: "مرسول به پست تحویل داده شد؛ کد رهگیری به‌زودی فعال می‌شود.",
          DELIVERED: "مرسول با موفقیت به خریدار تحویل داده شد.",
          CANCELLED: "سفارش لغو شد.",
        }[parsed.data.status],
      actor: user.role === "ADMIN" ? "مدیریت ریشه" : user.shopTitle || user.name,
    },
  });

  // Mark artworks sold when delivered
  if (parsed.data.status === "DELIVERED") {
    for (const item of order.items) {
      await db.artwork.updateMany({
        where: { id: item.artworkId, stock: { lte: item.quantity } },
        data: { status: "SOLD" },
      });
    }
  }

  await db.auditLog.create({
    data: {
      actor: user.email,
      action: "ORDER_STATUS",
      target: order.orderNumber,
      detail: `تغییر وضعیت به ${parsed.data.status}`,
    },
  });

  revalidatePath("/");
  return { ok: true, message: "وضعیت سفارش به‌روزرسانی شد." };
}
