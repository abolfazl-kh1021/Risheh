import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Postgres-backed rate limiter (Phase 1 hardening).
 *
 * The previous in-memory Map was useless on Vercel serverless (every instance
 * had its own memory — and a single global key could lock out ALL users at
 * once). Buckets now live in the `rate_limit_buckets` table keyed by
 * `action|ip[:account]`, with a single atomic UPSERT … RETURNING.
 *
 * Fail-open on DB errors: the app already requires the DB for everything; we
 * prefer availability over strict limiting during an outage (and log loudly).
 */

export type RateLimitVerdict = {
  ok: boolean;
  count: number;
  /** Milliseconds until the bucket resets (0 when allowed). */
  retryAfterMs: number;
};

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitVerdict> {
  const now = new Date();
  const resetAt = new Date(now.getTime() + windowMs);
  try {
    const rows = await db.$queryRaw<{ count: number; reset_at: Date }[]>`
      INSERT INTO rate_limit_buckets ("key", "count", "resetAt")
      VALUES (${key}, 1, ${resetAt})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "rate_limit_buckets"."resetAt" < ${now} THEN 1 ELSE "rate_limit_buckets"."count" + 1 END,
        "resetAt" = CASE WHEN "rate_limit_buckets"."resetAt" < ${now} THEN ${resetAt} ELSE "rate_limit_buckets"."resetAt" END
      RETURNING "count", "resetAt"
    `;
    const row = rows[0];
    if (!row) return { ok: true, count: 1, retryAfterMs: 0 };
    const retryAfterMs = Math.max(0, row.reset_at.getTime() - now.getTime());
    return { ok: row.count <= limit, count: row.count, retryAfterMs };
  } catch (err) {
    console.error("[rate-limit] bucket consume failed (fail-open):", err instanceof Error ? err.message : err);
    return { ok: true, count: 0, retryAfterMs: 0 };
  }
}

/** Boolean convenience wrapper matching the old call sites. */
export async function rateLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
  return (await consumeRateLimit(key, limit, windowMs)).ok;
}

/** Extract the caller IP from proxy headers (Vercel/Caddy/Docker). */
export function requestIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/** Best-effort IP for Server Actions (no Request object available). */
export function actionIp(): string {
  // Server Actions run without a typed Request; next/headers exposes only
  // cookies(). For finer per-IP limiting inside actions, use middleware to
  // stamp the IP into a trusted header we can read here.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { headers } = require("next/headers") as typeof import("next/headers");
    const h = headers();
    return requestIp(h as unknown as Headers);
  } catch {
    return "unknown";
  }
}

export async function purgeStaleBuckets(): Promise<number> {
  try {
    const res = await db.$executeRaw`DELETE FROM rate_limit_buckets WHERE "resetAt" < now()`;
    return res;
  } catch {
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Login lockout policy (Phase 3): per-IP and per-IP+account windows with the
// SAME generic error message (no user-enumeration leak).
// ---------------------------------------------------------------------------

export const LOGIN_LIMITS = {
  perIp: { limit: 20, windowMs: 10 * 60_000 },
  perAccount: { limit: 8, windowMs: 15 * 60_000 },
} as const;

export async function checkLoginAllowed(ip: string, email: string): Promise<boolean> {
  const ipOk = await rateLimit(`login|ip:${ip}`, LOGIN_LIMITS.perIp.limit, LOGIN_LIMITS.perIp.windowMs);
  const accOk = await rateLimit(
    `login|acct:${ip}:${email.toLowerCase()}`,
    LOGIN_LIMITS.perAccount.limit,
    LOGIN_LIMITS.perAccount.windowMs
  );
  return ipOk && accOk;
}

export function isUniqueViolation(e: unknown): e is Prisma.PrismaClientKnownRequestError {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
