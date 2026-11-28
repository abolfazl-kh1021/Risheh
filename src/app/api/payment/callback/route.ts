import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { finalizeOrderPayment, finalizeInvoicePayment } from "@/lib/payments/finalize";
import { rateLimit } from "@/lib/rate-limit";
import type { FinalizeResult } from "@/lib/payments/finalize";

/**
 * THE payment callback (server-side only, M6/§۴.۶).
 *
 * This endpoint is called by the gateway (demo or real) after the payer
 * returns. It NEVER trusts query parameters as the payment result: it looks
 * the attempt up by `authority` and asks the provider's verify() for the
 * authoritative verdict, then runs the single atomic finalization path.
 *
 * `no-store` everywhere: a payment result page must never be cached/CDN'd.
 */
export const dynamic = "force-dynamic";

function resultUrl(origin: string, result: FinalizeResult): URL {
  const url = new URL(result.redirectPath, origin);
  url.searchParams.set(
    "pay",
    result.status === "SUCCESS" ? "success" : result.status === "ALREADY" ? "already" : result.status.toLowerCase()
  );
  url.searchParams.set("msg", result.message);
  if (result.orderNumber) url.searchParams.set("order", result.orderNumber);
  return url;
}

export async function GET(req: NextRequest) {
  const origin = req.nextUrl.origin; // always redirect relative to THIS deployment
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const limited = await rateLimit(`callback|${ip}`, 40, 60_000);
  if (!limited) {
    const url = new URL("/cart", origin);
    url.searchParams.set("pay", "failed");
    url.searchParams.set("msg", "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید.");
    return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  const authority = req.nextUrl.searchParams.get("authority") ?? "";
  if (!authority) {
    const url = new URL("/cart", origin);
    url.searchParams.set("pay", "failed");
    url.searchParams.set("msg", "پارامترهای بازگشت از درگاه ناقص است.");
    return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  // Which flow does this authority belong to? (order vs invoice)
  const attempt = await db.paymentAttempt.findUnique({
    where: { authority },
    select: { id: true, orderId: true, invoiceId: true },
  });
  if (!attempt) {
    const url = new URL("/cart", process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000");
    url.searchParams.set("pay", "failed");
    url.searchParams.set("msg", "شناسه پرداخت یافت نشد.");
    return NextResponse.redirect(url, { status: 303, headers: { "Cache-Control": "no-store" } });
  }

  const result = attempt.orderId
    ? await finalizeOrderPayment(authority)
    : attempt.invoiceId
      ? await finalizeInvoicePayment(authority)
      : ({ status: "FAILED", message: "پرداخت به هیچ تراکنشی متصل نیست.", redirectPath: "/cart" } as FinalizeResult);

  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (result.refNumber) headers["X-Demo-Ref"] = result.refNumber;
  return NextResponse.redirect(resultUrl(origin, result), { status: 303, headers });
}
