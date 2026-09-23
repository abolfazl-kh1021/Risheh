import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

/**
 * DEMO AUTH ADAPTER — clearly labeled.
 *
 * This project runs in demo mode: passwords are hashed with scrypt,
 * sessions are random 256-bit tokens stored server-side in SQLite and
 * referenced by an httpOnly, SameSite=Lax cookie. No real production
 * identity provider is configured yet (see docs/SECURITY.md).
 */

const SESSION_COOKIE = "risheh_session";
const GUEST_COOKIE = "risheh_guest";
const SESSION_DAYS = 14;

function secret(): string {
  return process.env.AUTH_SECRET || "risheh-demo-secret-do-not-use-in-production";
}

// ---------- Password hashing (scrypt, no plaintext ever stored) ----------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    if (!salt || !hash) return false;
    const candidate = scryptSync(password, salt, 64);
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
  shopTitle?: string | null;
  province?: string | null;
  bio?: string | null;
  avatar?: string | null;
  verified: boolean;
  planId?: string | null;
};

export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, expiresAt } });
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
      shopTitle: session.user.shopTitle,
      province: session.user.province,
      bio: session.user.bio,
      avatar: session.user.avatar,
      verified: session.user.verified,
      planId: session.user.planId,
    };
  } catch {
    return null;
  }
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

// ---------- Simple in-memory rate limiter (abuse protection) ----------

const rateBuckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    rateBuckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  bucket.count += 1;
  return bucket.count <= limit;
}
