import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import type { Metadata } from "next";
import { DemoGatewayPanel } from "./DemoGatewayPanel";
import { faPrice } from "@/lib/fa";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "درگاه پرداخت نمایشی ریشه",
  robots: { index: false, follow: false },
};

/**
 * THE demo gateway page (M6, §۴.۶).
 *
 * Stands in for a real bank gateway. Every element is clearly labeled
 * «نمایشی — پول واقعی جابه‌جا نمی‌شود». The outcome the payer picks is stored
 * SERVER-SIDE via a server action, then the browser is redirected to the SAME
 * `/api/payment/callback` a real gateway would use. The client never supplies
 * the final result to the callback.
 */
export default async function DemoGatewayPage({
  params,
}: {
  params: Promise<{ authority: string }>;
}) {
  const { authority } = await params;
  const attempt = await db.paymentAttempt.findUnique({
    where: { authority },
    include: {
      order: { select: { orderNumber: true } },
      invoice: { select: { number: true, kind: true, description: true } },
    },
  });
  if (!attempt || attempt.provider !== "demo") notFound();

  if (attempt.status !== "PENDING") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-surface-container px-4" dir="rtl">
        <div className="w-full max-w-md rounded-3xl bg-surface-container-lowest shadow-lg p-8 text-center">
          <h1 className="text-xl font-bold text-on-surface mb-3">این پرداخت بسته شده است</h1>
          <p className="text-sm text-on-surface-variant leading-6">
            این تراکنش نمایشی قبلاً نتیجه خود را ثبت کرده و قابل انتخاب دوباره نیست.
          </p>
          <a
            href="/"
            className="mt-6 inline-flex items-center justify-center rounded-full bg-primary text-on-primary px-6 py-3 text-sm font-semibold"
          >
            بازگشت به ریشه
          </a>
        </div>
      </main>
    );
  }

  const reference = attempt.order?.orderNumber ?? attempt.invoice?.number ?? "—";
  const kindLabel =
    attempt.invoice?.kind === "LISTING_FEE"
      ? "کارمزد ثبت آگهی"
      : attempt.invoice?.kind === "SUBSCRIPTION"
        ? "خرید پلن اشتراک"
        : "پرداخت سفارش";

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface-container px-4 py-10" dir="rtl">
      <div className="w-full max-w-md">
        <div className="rounded-3xl bg-surface-container-lowest shadow-lg overflow-hidden">
          {/* Simulated bank header — clearly a simulation */}
          <div className="bg-primary text-on-primary px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-90">درگاه پرداخت نمایشی ریشه</p>
                <p className="text-lg font-bold mt-1">{kindLabel}</p>
              </div>
              <span className="rounded-full bg-white/10 border border-white/25 px-3 py-1 text-[11px] font-semibold tracking-wide">
                شبیه‌سازی — پول واقعی جابه‌جا نمی‌شود
              </span>
            </div>
            <p className="mt-4 text-2xl font-extrabold">{faPrice(attempt.amount)} تومان</p>
          </div>

          <div className="px-6 py-6">
            <dl className="grid grid-cols-2 gap-y-3 text-sm">
              <dt className="text-on-surface-variant">شناسه تراکنش</dt>
              <dd className="font-mono text-[11px] text-on-surface break-all" dir="ltr">{attempt.authority}</dd>
              <dt className="text-on-surface-variant">مرجع پرداخت</dt>
              <dd className="text-on-surface">{reference}</dd>
              {attempt.invoice?.description ? (
                <>
                  <dt className="text-on-surface-variant">شرح</dt>
                  <dd className="text-on-surface">{attempt.invoice.description}</dd>
                </>
              ) : null}
            </dl>

            <DemoGatewayPanel authority={attempt.authority} />

            <p className="mt-6 text-[11px] leading-5 text-on-surface-variant border-t border-surface-container-high pt-4">
              این صفحه فقط جریان درگاه واقعی را شبیه‌سازی می‌کند تا معماری پرداخت کامل و قابل‌تست باشد.
              نتیجه پرداخت تنها روی سرور و پس از «تایید» ثبت می‌شود؛ هیچ پول واقعی جابه‌جا نمی‌شود و
              هیچ ادعای درگاه بانکی واقعی وجود ندارد.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
