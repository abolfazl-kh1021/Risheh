#!/usr/bin/env bun
/**
 * Admin provisioning script (scope M3: «ادمین فقط provision می‌شود»).
 *
 *   bun run admin:create                 # prompts via env or args
 *   ADMIN_EMAIL=admin@x.ir ADMIN_PASSWORD='…' bun run admin:create
 *
 * NEVER creates the admin through public registration. Requires AUTH_SECRET
 * to be set (same rule as the app). Refuses weak passwords. Idempotent:
 * re-running with the same email updates the password hash.
 */
import { PrismaClient } from "@prisma/client";
import { scryptSync, randomBytes, timingSafeEqual } from "crypto";
import readline from "readline";

const db = new PrismaClient();

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64, { N: 16384, r: 8, p: 1 }).toString("hex");
  return `s1:16384:8:1:${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  try {
    const [, n, r, p, salt, hash] = stored.split(":");
    const candidate = scryptSync(password, salt, 64, { N: Number(n), r: Number(r), p: Number(p) });
    const expected = Buffer.from(hash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch {
    return false;
  }
}

async function prompt(label: string): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer: string = await new Promise((resolve) => rl.question(label, resolve));
  rl.close();
  return answer.trim();
}

async function main() {
  if (!process.env.AUTH_SECRET || process.env.AUTH_SECRET.length < 32) {
    console.error("ERROR: AUTH_SECRET must be set (≥32 chars). Generate: openssl rand -hex 32");
    process.exit(1);
  }
  if (process.env.DEMO_MODE === "true") {
    console.error("ERROR: admin:create refuses to run with DEMO_MODE=true (demo seed owns demo accounts).");
    process.exit(1);
  }

  const email = (process.env.ADMIN_EMAIL ?? (await prompt("ایمیل ادمین: "))).toLowerCase();
  const password = process.env.ADMIN_PASSWORD ?? (await prompt("گذرواژه ادمین (حداقل ۸ نویسه، حرف+رقم): "));
  const name = process.env.ADMIN_NAME ?? (await prompt("نام نمایشی: "));

  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    console.error("ERROR: invalid email"); process.exit(1);
  }
  if (password.length < 8 || !/[a-zA-Z]/.test(password) || !/\d/.test(password)) {
    console.error("ERROR: password must be ≥8 chars with a letter and a digit"); process.exit(1);
  }

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    if (verifyPassword(password, existing.passwordHash) && existing.role === "ADMIN") {
      console.log(`Admin ${email} already exists with this password — nothing to do.`);
      await db.$disconnect();
      return;
    }
    await db.user.update({
      where: { email },
      data: { passwordHash: hashPassword(password), role: "ADMIN", name: name || existing.name },
    });
    await db.session.deleteMany({ where: { userId: existing.id } });
    console.log(`Existing user ${email} promoted/updated to ADMIN (sessions invalidated).`);
  } else {
    const admin = await db.user.create({
      data: { email, passwordHash: hashPassword(password), name: name || "مدیر ریشه", role: "ADMIN", verified: true },
    });
    console.log(`Admin created: ${admin.email} (${admin.id})`);
  }
  await db.auditLog.create({
    data: { actor: "admin:create-script", action: "ADMIN_PROVISION", target: email, detail: "via admin:create" },
  });
  await db.$disconnect();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
