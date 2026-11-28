"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { rateLimit } from "@/lib/rate-limit";
import { actionIp } from "@/lib/session";
import { assertTransition, PAYMENT_MACHINE } from "@/lib/state-machines";

/**
 * DEMO GATEWAY SERVER ACTIONS (M6).
 *
 * The outcome the payer picks on the demo gateway page is stored SERVER-SIDE
 * (`PaymentAttempt.demoOutcome`). The payment callback then asks the demo
 * provider's verify() — which reads this stored value. A client query
 * parameter is never trusted as the payment result.
 */

const outcomeSchema = z.object({
  authority: z.string().min(6).max(80),
  outcome: z.enum(["SUCCESS", "FAILED", "CANCELED"]),
});

/**
 * Record the demo outcome and redirect to the real callback URL — exactly
 * like a gateway redirect. The redirect target is the SAME
 * `/api/payment/callback` that a real gateway posts to.
 */
export async function recordDemoOutcomeAction(
  input: z.input<typeof outcomeSchema>
): Promise<{ ok: true; redirectTo: string } | { ok: false; error: string }> {
  if (!rateLimit(`demo-pay|${actionIp()}`, 30, 60_000)) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const parsed = outcomeSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "پارامترهای درگاه نمایشی نامعتبر است." };

  const attempt = await db.paymentAttempt.findUnique({ where: { authority: parsed.data.authority } });
  if (!attempt) return { ok: false, error: "شناسه پرداخت یافت نشد." };
  if (attempt.provider !== "demo") {
    return { ok: false, error: "این پرداخت از طریق درگاه نمایشی آغاز نشده است." };
  }
  assertTransition(PAYMENT_MACHINE, "payment", attempt.status, parsed.data.outcome);

  await db.paymentAttempt.update({
    where: { id: attempt.id },
    data: {
      demoOutcome: parsed.data.outcome,
      callbackAt: new Date(),
      message:
        parsed.data.outcome === "SUCCESS"
          ? "نتیجه نمایشی روی سرور ثبت شد؛ در انتظار تایید callback."
          : parsed.data.outcome === "FAILED"
            ? "شبیه‌سازی خطای درگاه ثبت شد."
            : "لغو توسط کاربر ثبت شد.",
    },
  });
  await db.paymentEvent.create({
    data: {
      paymentAttemptId: attempt.id,
      type: "CALLBACK",
      detail: `نتیجه نمایشی (${parsed.data.outcome}) روی سرور ثبت شد`,
    },
  });

  // Mirror a real gateway: redirect the browser to the shared callback route.
  redirect(`/api/payment/callback?authority=${encodeURIComponent(attempt.authority)}&provider=demo`);
}
