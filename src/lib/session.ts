import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";

/**
 * AUTH/SESSION CORE — clearly labeled.
 *
 * Passwords are hashed with scrypt (explicit parameters), sessions are random
 * 256-bit tokens stored server-side in Postgres and referenced by an
 * httpOnly, SameSite=Lax, signed cookie. Rate limiting moved to the
 * Postgres-backed limiter in `src/lib/rate-limit.ts` (serverless-safe,
 * per-IP/per-account) — see that file for the implementation.
 */

const SESSION_COOKIE = "risheh_session";
const GUEST_COOKIE = "risheh_guest";
const SESSION_DAYS = 14;

/** AUTH_SECRET is REQUIRED and must be ≥ 32 chars — no fallback, no demo secret. */
function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or shorter than 32 characters. Generate one with `openssl rand -hex 32`."
    );
  }
  return s;
}

// ---------- Password hashing (scrypt, explicit params, no plaintext stored) ----------

const SCRYPT_N = 16384; // r=8, p=1 defaults — explicit for clarity/reproducibility
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, SCRYPT_KEYLEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P }).toString("hex");
  return `s1:${SCRYPT_N}:${SCRYPT_R}:${SCRYPT_P}:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    if (stored.startsWith("s1:")) {
      const [, nStr, rStr, pStr, salt, hash] = stored.split(":");
      if (!nStr || !rStr || !pStr || !salt || !hash) return false;
      const candidate = scryptSync(password, salt, SCRYPT_KEYLEN, {
        N: Number(nStr),
        r: Number(rStr),
        p: Number(pStr),
      });
      const expected = Buffer.from(hash, "hex");
      return candidate.length === expected.length && timingSafeEqual(candidate, expected);
    }
    // Legacy format `salt:hash` (pre-migration rows) — verified then upgraded.
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, SCRYPT_KEYLEN);
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

function signToken(token: string): string {
  const sig = createHmac("sha256", secret()).update(token).digest("hex").slice(0, 32);
  return `${token}.${sig}`;
}

function verifySigned(raw: string): string | null {
  const [token, sig] = raw.split(".");
  if (!token || !sig) return null;
  const expected = createHmac("sha256", secret()).update(token).digest("hex").slice(0, 32);
  if (sig.length !== expected.length) return null;
  return timingSafeEqual(Buffer.from(sig), Buffer.from(expected)) ? token : null;
}

// ---------- Session management (server-side store) ----------

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: "BUYER" | "ARTISAN" | "ADMIN";
  slug?: string | null;
  shopTitle?: string | null;
  province?: string | null;
  bio?: string | null;
  avatar?: string | null;
  iban?: string | null;
  verified: boolean;
};

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  let ip: string | null = null;
  let userAgent: string | null = null;
  try {
    const h = await headers();
    ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
    userAgent = h.get("user-agent")?.slice(0, 240) ?? null;
  } catch {
    /* headers unavailable outside a request scope */
  }
  await db.session.create({ data: { token, userId, expiresAt, ip, userAgent } });
  const store = await cookies();
  store.set(SESSION_COOKIE, signToken(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const raw = store.get(SESSION_COOKIE)?.value;
  if (raw) {
    const token = verifySigned(raw);
    if (token) {
      await db.session.deleteMany({ where: { token } });
    }
  }
  store.delete(SESSION_COOKIE);
}

/** «خروج از همه‌ی دستگاه‌ها» — invalidates every session of the user. */
export async function destroyAllSessions(userId: string): Promise<number> {
  const res = await db.session.deleteMany({ where: { userId } });
  return res.count;
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    if (!raw) return null;
    const token = verifySigned(raw);
    if (!token) return null;
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expiresAt.getTime() < Date.now()) {
      await db.session.delete({ where: { id: session.id } }).catch(() => undefined);
      return null;
    }
    return {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role as SessionUser["role"],
      slug: session.user.slug,
      shopTitle: session.user.shopTitle,
      province: session.user.province,
      bio: session.user.bio,
      avatar: session.user.avatar,
      iban: session.user.iban,
      verified: session.user.verified,
    };
  } catch {
    return null;
  }
}

/** Active sessions of the current user (for the sessions page, Phase 3). */
export async function listActiveSessions(userId: string): Promise<{
  sessions: Array<{ id: string; ip: string | null; userAgent: string | null; createdAt: Date; expiresAt: Date }>;
  currentSessionId: string | null;
}> {
  const sessions = await db.session.findMany({
    where: { userId, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
    select: { id: true, token: true, ip: true, userAgent: true, createdAt: true, expiresAt: true },
  });
  let currentSessionId: string | null = null;
  try {
    const store = await cookies();
    const raw = store.get(SESSION_COOKIE)?.value;
    const token = raw ? verifySigned(raw) : null;
    if (token) currentSessionId = sessions.find((s) => s.token === token)?.id ?? null;
  } catch {
    /* ignore */
  }
  return {
    sessions: sessions.map(({ token: _token, ...rest }) => rest),
    currentSessionId,
  };
}

// ---------- Guest cart key ----------

export async function getGuestKey(): Promise<string | null> {
  const store = await cookies();
  return store.get(GUEST_COOKIE)?.value ?? null;
}

export async function ensureGuestKey(): Promise<string> {
  const store = await cookies();
  const existing = store.get(GUEST_COOKIE)?.value;
  if (existing) return existing;
  const key = randomBytes(16).toString("hex");
  store.set(GUEST_COOKIE, key, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });
  return key;
}

// ---------- Server Action caller IP ----------

export async function actionIp(): Promise<string> {
  try {
    const h = await headers();
    return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip")?.trim() ?? "unknown";
  } catch {
    return "unknown";
  }
}
