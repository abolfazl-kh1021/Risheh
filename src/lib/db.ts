import { Prisma, PrismaClient } from "@prisma/client"

/**
 * Production-grade Prisma client for PostgreSQL (Neon) on Vercel serverless.
 *
 * Layout:
 *   - `db`       → the single PrismaClient instance (identical export name/API as
 *                  before, so every `import { db } from "@/lib/db"` keeps working).
 *   - `dbRetry`  → automatic retry wrapper for TRANSIENT failures only:
 *                  Neon cold-start timeouts, connection-pool exhaustion,
 *                  deadlocks and serialization failures. Business errors
 *                  (unique violation, FK violation, not-found…) are never
 *                  retried and bubble up immediately.
 *   - `dbTx`     → interactive transaction with sane timeouts + transient-retry,
 *                  for multi-step writes that must be atomic.
 *   - `dbHealthCheck` → cheap `SELECT 1` probe for status pages / monitors.
 *
 * Why the singleton matters: on Vercel each serverless instance must open at
 * most ONE PrismaClient; caching it on `globalThis` also survives Next.js dev
 * hot-reloads, so the process never leaks connections. Combined with Neon's
 * pooled endpoint (`-pooler` host + `pgbouncer=true` in DATABASE_URL) this is
 * the documented setup that avoids `P2024` (pool timeout) and
 * "prepared statement already exists" errors.
 */

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    // Query logging is a dev aid — serializing every statement costs CPU and
    // log volume in production. Errors/warnings are always logged.
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  })

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db

// ---------------------------------------------------------------------------
// Transient-error detection + retry
// ---------------------------------------------------------------------------

/** Prisma error codes that are safe to retry (infrastructure, not logic). */
const TRANSIENT_PRISMA_CODES = new Set([
  "P1001", // can't reach the database server (Neon cold start, DNS blip)
  "P1002", // connection attempt timed out (cold start beyond connect_timeout)
  "P1008", // operation timed out
  "P2024", // timed out fetching a new connection from the pool (pool_timeout)
  "P2034", // transaction conflict: write conflict or deadlock
])

/**
 * Postgres SQLSTATEs that are safe to retry. 40001 = serialization failure,
 * 40P01 = deadlock detected — both are resolved by simply retrying.
 */
const TRANSIENT_SQLSTATE = /40001|40P01|deadlock detected|could not serialize/i

export function isTransientDbError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_PRISMA_CODES.has(error.code)
  }
  if (error instanceof Prisma.PrismaClientUnknownRequestError) {
    return TRANSIENT_SQLSTATE.test(error.message)
  }
  if (error instanceof Error) {
    return TRANSIENT_SQLSTATE.test(error.message)
  }
  return false
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

export type DbRetryOptions = {
  /** Total attempts (first call + retries). Default 4. */
  tries?: number
  /** Base delay for exponential backoff. Default 150ms. */
  baseDelayMs?: number
  /** Upper bound for a single backoff step. Default 1500ms. */
  maxDelayMs?: number
}

/**
 * Run `fn` with automatic retry on transient DB errors (exponential backoff
 * with jitter). Wrap READS and single WRITE calls that hit the database over
 * the network (Neon) when the operation is idempotent — which every Prisma
 * read and single-row write is.
 */
export async function dbRetry<T>(
  fn: () => Promise<T>,
  opts: DbRetryOptions = {}
): Promise<T> {
  const tries = opts.tries ?? 4
  const baseDelayMs = opts.baseDelayMs ?? 150
  const maxDelayMs = opts.maxDelayMs ?? 1500

  let lastError: unknown
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt === tries || !isTransientDbError(error)) throw error
      const step = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1))
      const delay = Math.round(step * (0.75 + Math.random() * 0.5)) // jitter
      console.warn(
        `[db] transient error (attempt ${attempt}/${tries}) — retrying in ~${delay}ms:`,
        error instanceof Error ? error.message : error
      )
      await sleep(delay)
    }
  }
  throw lastError
}

export type DbTxOptions = DbRetryOptions & {
  /** Max wait to acquire a transaction connection (ms). Default 5s. */
  maxWait?: number
  /** Max transaction runtime (ms). Default 20s. */
  timeout?: number
}

/**
 * Atomic interactive transaction with transient-retry semantics.
 *
 * ```ts
 * await dbTx(async (tx) => {
 *   await tx.order.create({ data: { … } })
 *   await tx.artwork.update({ … })
 * })
 * ```
 */
export async function dbTx<T>(
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
  opts: DbTxOptions = {}
): Promise<T> {
  const { maxWait = 5_000, timeout = 20_000, ...retry } = opts
  return dbRetry(() => db.$transaction(fn, { maxWait, timeout }), retry)
}

/**
 * Cheap connectivity probe (`SELECT 1`) — usable from monitors or a DB-aware
 * health endpoint. Never throws.
 */
export async function dbHealthCheck(): Promise<boolean> {
  try {
    await db.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}
