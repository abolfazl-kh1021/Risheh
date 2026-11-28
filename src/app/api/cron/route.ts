import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { purgeStaleBuckets } from "@/lib/rate-limit";
import {
  expireReservations,
  expirePendingOrders,
  expireListings,
  expireSubscriptions,
  releaseRetention,
} from "@/lib/cron-tasks";

/**
 * Secure cron endpoint (Phase 1) — wired via vercel.json + CRON_SECRET.
 *
 * Auth: the `Authorization: Bearer <CRON_SECRET>` header (Vercel Cron sends
 * it) or `?secret=`. Without a matching secret the endpoint returns 401 and
 * does NOTHING — crons are never public.
 */
export const dynamic = "force-dynamic";

function authorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // no secret configured → cron disabled entirely
  const header = req.headers.get("authorization") ?? "";
  if (header === `Bearer ${secret}`) return true;
  return req.nextUrl.searchParams.get("secret") === secret;
}

export async function GET(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const results: Record<string, number | string> = {};
  results.staleBuckets = await purgeStaleBuckets().catch(() => 0);
  results.expiredReservations = await expireReservations().catch((e) => String(e));
  results.expiredOrders = await expirePendingOrders().catch((e) => String(e));
  results.expiredListings = await expireListings().catch((e) => String(e));
  results.expiredSubscriptions = await expireSubscriptions().catch((e) => String(e));
  results.releasedRetention = await releaseRetention().catch((e) => String(e));
  results.expiredSessions = await db.session
    .deleteMany({ where: { expiresAt: { lt: new Date() } } })
    .then((r) => r.count)
    .catch(() => 0);
  results.expiredPendingPayments = await db.paymentAttempt
    .updateMany({
      where: { status: "PENDING", createdAt: { lt: new Date(Date.now() - 24 * 3600 * 1000) } },
      data: { status: "CANCELED", verifiedAt: new Date(), message: "انقضای خودکار تلاش پرداخت (cron)" },
    })
    .then((r) => r.count)
    .catch(() => 0);

  return NextResponse.json({ ok: true, at: new Date().toISOString(), results });
}
