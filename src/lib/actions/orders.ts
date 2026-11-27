"use server";

import { z } from "zod";
import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { db, dbTx } from "@/lib/db";
import { getCurrentUser, getGuestKey, rateLimit } from "@/lib/session";
import { invalidatePublicCatalog } from "@/lib/data";
import { evaluateDiscountForCheckout } from "@/lib/discount-engine";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * DEMO PAYMENT ADAPTER — clearly labeled simulation.
 * No real bank gateway is configured (see docs/DEPLOYMENT.md).
 * The payment result is produced by this server-side adapter only after
 * a server-issued `authority` is verified; a client redirect or query
 * parameter alone is never treated as proof of payment.
 *
 * Concurrency & consistency rules implemented here (docs/SECURITY.md §5):
 *  - Prices/totals/discounts are ALWAYS recomputed server-side from the DB.
 *  - Payment finalization claims the PENDING row atomically
 *    (`updateMany … status: "PENDING"`) → duplicate submissions cannot
 *    double-finalize (idempotency, M6).
 *  - Stock decrement is guarded (`stock >= qty`) inside one interactive
 *    transaction → inventory can never go negative; a failed guard rolls
 *    back the whole finalization atomically (M5).
 *  - Ledger entries are written from net (post-discount) item shares so the
 *    10% commission matches the recorded sale exactly (M8).
 *  - Cancelling a paid order restores stock and reverses its ledger entries.
 */

const SHIPPING_METHODS: Record<string, number> = {
  free: 0, // ارسال رایگان بیمه‌شده ریشه
  courier: 50000, // پیک اختصاصی و بیمه‌شده ریشه
  tipax: 75000, // ارسال سریع تیپاکس سراسری
};

/** 10% platform commission — demo accounting model (M8). */
const COMMISSION_RATE = 0.1;

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
  // Optional checkout discount code (S7) — validated + recomputed server-side.
  discountCode: z.string().max(40).optional().or(z.literal("")),
});

export type CreateOrderResult =
  | {
      ok: true;
      orderNumber: string;
      authority: string;
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
  if (!rateLimit("checkout", 20, 60_000)) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
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

  // Collision-free order number (timestamp + random suffix, uniqueness-checked).
  const orderNumber = await uniqueOrderNumber();
  const authority = `DEMO-${randomBytes(12).toString("hex")}`;
  const shipping = SHIPPING_METHODS[parsed.data.shippingMethod] ?? 0;
  const total = Math.max(0, subtotal - discount) + shipping;

  await db.order.create({
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

  return {
    ok: true,
    orderNumber,
    authority,
    amount: total,
    subtotal,
    discount,
    shipping,
    discountMessage,
  };
}

async function uniqueOrderNumber(): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const candidate = `RSH-ORD-${Date.now().toString().slice(-8)}-${randomBytes(2)
      .toString("hex")
      .toUpperCase()}`;
    const exists = await db.order.findUnique({
      where: { orderNumber: candidate },
      select: { id: true },
    });
    if (!exists) return candidate;
  }
  return `RSH-ORD-${randomBytes(6).toString("hex").toUpperCase()}`;
}

const verifySchema = z.object({
  authority: z.string().min(6),
  outcome: z.enum(["SUCCESS", "FAILED", "CANCELLED"]),
});

export type VerifyPaymentResult =
  | {
      ok: true;
      status: "SUCCESS" | "FAILED" | "CANCELLED";
      orderNumber: string;
      refNumber?: string;
      message: string;
    }
  | { ok: false; error: string };

/** Control-flow errors used to roll back the payment transaction cleanly. */
class AlreadyFinalizedError extends Error {}
class InsufficientStockError extends Error {
  constructor(public title: string) {
    super(`stock: ${title}`);
  }
}

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

  // Session identity (for cart clearing / redemption) — read before the tx.
  const sessionUser = await getCurrentUser();
  const guestKey = await getGuestKey();

  const outcome = parsed.data.outcome;
  const refNumber =
    outcome === "SUCCESS" ? `DEMO-REF-${randomBytes(5).toString("hex").toUpperCase()}` : undefined;

  try {
    await dbTx(async (tx) => {
      if (outcome === "SUCCESS") {
        // 1) Guarded stock decrement — never allow negative inventory (M5).
        for (const item of payment.order.items) {
          const upd = await tx.artwork.updateMany({
            where: { id: item.artworkId, stock: { gte: item.quantity } },
            data: { stock: { decrement: item.quantity } },
          });
          if (upd.count === 0) {
            throw new InsufficientStockError(item.titleSnapshot);
          }
        }
      }

      // 2) Atomic idempotency claim — only ONE call can finalize a payment (M6).
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: payment.id, status: "PENDING" },
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
      if (claimed.count === 0) {
        throw new AlreadyFinalizedError();
      }

      if (outcome === "SUCCESS") {
        // 3) Advance order + tracking.
        await tx.order.update({ where: { id: payment.orderId }, data: { status: "PAID" } });
        await tx.trackingEvent.create({
          data: {
            orderId: payment.orderId,
            status: "PAID",
            detail: "پرداخت (نمایشی) تایید شد؛ سفارش در صف آماده‌سازی کارگاه قرار گرفت.",
            actor: "درگاه نمایشی ریشه",
          },
        });

        // 4) Ledger entries from NET (post-discount) shares (M8).
        const subtotal = payment.order.subtotal;
        const discount = payment.order.discount;
        const netTotal = Math.max(0, subtotal - discount);
        const items = payment.order.items;
        let consumed = 0;
        for (let i = 0; i < items.length; i++) {
          const gross = items[i].unitPrice * items[i].quantity;
          // Proportional net share; rounding residue lands on the last item.
          const share =
            i === items.length - 1
              ? netTotal - consumed
              : Math.round((gross * netTotal) / Math.max(1, subtotal));
          consumed += share;
          const commission = Math.round(share * COMMISSION_RATE);

          await tx.ledgerEntry.create({
            data: {
              sellerId: items[i].sellerId,
              orderId: payment.orderId,
              kind: "SALE",
              amount: share,
              detail: `فروش «${items[i].titleSnapshot}» — سفارش ${payment.order.orderNumber}`,
              status: "CLEARED",
            },
          });
          await tx.ledgerEntry.create({
            data: {
              sellerId: items[i].sellerId,
              orderId: payment.orderId,
              kind: "COMMISSION",
              amount: -commission,
              detail: `کارمزد پلتفرم (۱۰٪) سفارش ${payment.order.orderNumber}`,
              status: "CLEARED",
            },
          });
        }

        // 5) Discount redemption bookkeeping (S7): promote the buyer's CLAIMED
        //    redemption of THIS code to APPLIED, or record a first use.
        if (discount > 0 && payment.order.discountCodeId && sessionUser) {
          const codeId = payment.order.discountCodeId;
          const code = await tx.discountCode.findUnique({ where: { id: codeId } });
          if (code) {
            const claimedRow = await tx.discountRedemption.findFirst({
              where: { codeId, userId: sessionUser.id, status: "CLAIMED" },
              orderBy: { createdAt: "asc" },
            });
            if (claimedRow) {
              await tx.discountRedemption.update({
                where: { id: claimedRow.id },
                data: { status: "APPLIED" },
              });
            } else {
              const myUses = await tx.discountRedemption.count({
                where: { codeId, userId: sessionUser.id },
              });
              if (myUses < code.perUserLimit) {
                await tx.discountRedemption.create({
                  data: { codeId, userId: sessionUser.id, status: "APPLIED" },
                });
                await tx.discountCode.update({
                  where: { id: codeId },
                  data: { usedCount: { increment: 1 } },
                });
              }
            }
          }
        }

        // 6) Successful checkout clears the buyer's cart (order was created from it).
        await tx.cartItem.deleteMany({
          where: sessionUser ? { userId: sessionUser.id } : { guestKey: guestKey ?? "__none__" },
        });
      } else {
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: outcome === "CANCELLED" ? "CANCELLED" : "PAYMENT_FAILED" },
        });
        await tx.trackingEvent.create({
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
    });
  } catch (err) {
    if (err instanceof AlreadyFinalizedError) {
      return { ok: false, error: "این تراکنش قبلاً نهایی شده است." };
    }
    if (err instanceof InsufficientStockError) {
      return {
        ok: false,
        error: `موجودی «${err.title}» پس از ثبت سفارش تغییر کرد؛ پرداخت نهایی نشد. سبد خود را بازبینی کنید.`,
      };
    }
    throw err;
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

  await dbTx(async (tx) => {
    await tx.order.update({
      where: { id: order.id },
      data: { status: parsed.data.status },
    });
    await tx.trackingEvent.create({
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
        await tx.artwork.updateMany({
          where: { id: item.artworkId, stock: { lte: item.quantity } },
          data: { status: "SOLD" },
        });
      }
    }

    // Cancelling a paid/preparing order restores stock and reverses the
    // ledger entries of that order so artisan balances stay consistent (M8).
    if (parsed.data.status === "CANCELLED") {
      for (const item of order.items) {
        await tx.artwork.updateMany({
          where: { id: item.artworkId },
          data: { stock: { increment: item.quantity } },
        });
      }
      const previous = await tx.ledgerEntry.findMany({
        where: { orderId: order.id },
      });
      for (const entry of previous) {
        await tx.ledgerEntry.create({
          data: {
            sellerId: entry.sellerId,
            orderId: order.id,
            kind: entry.kind,
            amount: -entry.amount,
            status: "CLEARED",
            detail: `ابطال قلم «${entry.detail ?? entry.kind}» به‌دلیل لغو سفارش ${order.orderNumber}`,
          },
        });
      }
    }

    await tx.auditLog.create({
      data: {
        actor: user.email,
        action: "ORDER_STATUS",
        target: order.orderNumber,
        detail: `تغییر وضعیت به ${parsed.data.status}`,
      },
    });
  });

  revalidatePath("/");
  return { ok: true, message: "وضعیت سفارش به‌روزرسانی شد." };
}
