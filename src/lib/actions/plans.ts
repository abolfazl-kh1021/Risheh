"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, actionIp } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions/auth";
import { getPaymentProvider } from "@/lib/payments";
import { uniqueInvoiceNumber } from "@/lib/ids";
import { effectivePlan } from "@/lib/payments/finalize";
import { notify } from "@/lib/notify";

/**
 * Plan purchase / upgrade / renewal (S5, §۴.۳) — invoice + PaymentProvider.
 * Activation happens ONLY in finalizeInvoicePayment after server verify.
 */

export type BuyPlanResult =
  | { ok: true; redirectUrl: string | null; message: string }
  | { ok: false; error: string };

export async function buyPlanAction(planId: string): Promise<BuyPlanResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "خرید پلن فقط برای استادکاران است." };
  }
  if (!(await rateLimit(`plan-buy|${await actionIp()}`, 8, 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }

  const plan = await db.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) return { ok: false, error: "پلن یافت نشد یا غیرفعال است." };
  if (plan.id === "free") {
    return { ok: false, error: "پلن رایگان نیازمند خرید نیست." };
  }
  if (plan.priceToman === 0) {
    return { ok: false, error: "این پلن رایگان است و فاکتوری ندارد." };
  }

  // Resume an unpaid PENDING invoice for the same plan instead of duplicating.
  const pending = await db.invoice.findFirst({
    where: { payerId: user.id, kind: "SUBSCRIPTION", status: "PENDING" },
    include: { attempts: { where: { status: "PENDING" } } },
  });
  const pendingSub = pending
    ? await db.subscription.findFirst({ where: { invoiceId: pending.id, planId } })
    : null;
  if (pending && pendingSub && pending.attempts.length > 0) {
    return {
      ok: true,
      redirectUrl: `/pay/demo/${encodeURIComponent(pending.attempts[0].authority)}`,
      message: "فاکتور پیشین این پلن در انتظار پرداخت است.",
    };
  }

  const provider = getPaymentProvider();
  let authority: string;
  try {
    const req = await provider.request({
      invoiceOrOrderId: plan.id,
      amount: plan.priceToman,
      callbackUrl: "/api/payment/callback",
      description: `خرید پلن ${plan.title}`,
    });
    authority = req.authority;
  } catch {
    return { ok: false, error: "اتصال به درگاه پرداخت ناموفق بود؛ کمی بعد تلاش کنید." };
  }

  await db.$transaction(async (tx) => {
    // Snapshot the seller's effective plan BEFORE the purchase (for the record).
    const before = await effectivePlan(user.id);
    const invoice = await tx.invoice.create({
      data: {
        number: await uniqueInvoiceNumber(),
        payerId: user.id,
        kind: "SUBSCRIPTION",
        status: "PENDING",
        amount: plan.priceToman,
        description: `خرید/تمدید پلن ${plan.title} (پلن پیشین: ${before.title})`,
      },
    });
    await tx.subscription.create({
      data: {
        sellerId: user.id,
        planId: plan.id,
        status: "PENDING",
        startsAt: new Date(),
        expiresAt: new Date(Date.now() + plan.periodDays * 24 * 3600 * 1000),
        invoiceId: invoice.id,
      },
    });
    await tx.paymentAttempt.create({
      data: {
        invoiceId: invoice.id,
        provider: provider.name,
        authority,
        amount: plan.priceToman,
        status: "PENDING",
      },
    });
    await tx.auditLog.create({
      data: { actor: user.email, action: "PLAN_BUY_INTENT", target: plan.id, detail: `${plan.priceToman.toLocaleString("fa-IR")} تومان (نمایشی)` },
    });
  });

  revalidatePath("/dashboard/plans");
  return {
    ok: true,
    redirectUrl: `/pay/demo/${encodeURIComponent(authority)}`,
    message: "فاکتور پلن ساخته شد؛ در حال انتقال به درگاه پرداخت…",
  };
}

/** Seller claim of the listing-fee credit balance (M8 view helper). */
export async function myListingFeeCreditAction(): Promise<{ ok: true; amount: number } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const credits = await db.ledgerEntry.aggregate({
    where: { sellerId: user.id, kind: "LISTING_FEE_REFUND", status: "CLEARED" },
    _sum: { amount: true },
  });
  return { ok: true, amount: credits._sum.amount ?? 0 };
}

export async function notifyPlanExpiredManually(sellerId: string, planTitle: string): Promise<void> {
  await notify({
    userId: sellerId,
    type: "PLAN",
    title: "پلن منقضی شد",
    body: `اشتراک پلن ${planTitle} به پایان رسید.`,
    link: "/dashboard/plans",
  });
}
