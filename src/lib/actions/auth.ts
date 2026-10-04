"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  rateLimit,
  verifyPassword,
} from "@/lib/session";
import { toEnDigits } from "@/lib/fa";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ نویسه باشد").max(60),
  email: z.string().email("نشانی رایانامه معتبر نیست"),
  password: z.string().min(8, "گذرواژه باید حداقل ۸ نویسه باشد").max(100),
  role: z.enum(["BUYER", "ARTISAN"]).default("BUYER"),
  workshop: z.string().max(120).optional().or(z.literal("")),
  province: z.string().max(40).optional().or(z.literal("")),
});

const loginSchema = z.object({
  email: z.string().email("نشانی رایانامه معتبر نیست"),
  password: z.string().min(1, "گذرواژه الزامی است"),
});

export async function registerAction(
  input: z.input<typeof registerSchema>
): Promise<ActionResult> {
  if (!rateLimit("register", 10, 60_000)) {
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." };
  }
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const { name, email, password, role, workshop, province } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    return { ok: false, error: "این رایانامه پیش‌تر ثبت شده است؛ وارد شوید." };
  }
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name: name.trim(),
      role,
      shopTitle: role === "ARTISAN" && workshop ? workshop.trim() : null,
      province: province ? province.trim() : null,
      verified: false,
    },
  });
  if (role === "ARTISAN") {
    await db.memberRequest.create({
      data: {
        userId: user.id,
        planId: "bronze",
        workshop: workshop?.trim() || "کارگاه هنری",
        province: province?.trim() || "—",
        status: "PENDING",
      },
    });
    await db.auditLog.create({
      data: { actor: normalizedEmail, action: "MEMBER_REQUEST", target: workshop || name, detail: "درخواست پیوستن استادکار جدید" },
    });
  }
  await createSession(user.id);
  return { ok: true, message: role === "ARTISAN" ? "ثبت‌نام انجام شد؛ درخواست عضویت استادکار شما در صف بررسی است." : "ثبت‌نام با موفقیت انجام شد." };
}

export async function loginAction(input: z.input<typeof loginSchema>): Promise<ActionResult> {
  if (!rateLimit("login", 15, 60_000)) {
    return { ok: false, error: "تلاش‌های ناموفق بیش از حد مجاز؛ لطفاً یک دقیقه صبر کنید." };
  }
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const normalizedEmail = parsed.data.email.trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { ok: false, error: "رایانامه یا گذرواژه نادرست است." };
  }
  await createSession(user.id);
  return { ok: true };
}

export async function logoutAction(): Promise<ActionResult> {
  await destroySession();
  return { ok: true };
}

const profileSchema = z.object({
  name: z.string().min(2).max(60),
  phone: z.string().max(20).optional().or(z.literal("")),
  bio: z.string().max(600).optional().or(z.literal("")),
});

export async function updateProfileAction(input: z.input<typeof profileSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب خود شوید." };
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  await db.user.update({
    where: { id: user.id },
    data: {
      name: parsed.data.name.trim(),
      phone: parsed.data.phone ? toEnDigits(parsed.data.phone).trim() : null,
      bio: parsed.data.bio?.trim() || null,
    },
  });
  return { ok: true, message: "پروفایل به‌روزرسانی شد." };
}
