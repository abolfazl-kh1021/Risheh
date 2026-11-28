"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import {
  createSession,
  destroyAllSessions,
  destroySession,
  getCurrentUser,
  hashPassword,
  listActiveSessions,
  verifyPassword,
} from "@/lib/session";
import { checkLoginAllowed, rateLimit, actionIp } from "@/lib/rate-limit";
import { toEnDigits } from "@/lib/fa";
import { mergeGuestCart } from "@/lib/actions/cart-merge";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const registerSchema = z.object({
  name: z.string().min(2, "نام باید حداقل ۲ نویسه باشد").max(60),
  email: z.string().email("نشانی رایانامه معتبر نیست"),
  password: z
    .string()
    .min(8, "گذرواژه باید حداقل ۸ نویسه باشد")
    .max(100)
    .regex(/[a-zA-Z]/, "گذرواژه باید حداقل یک حرف داشته باشد")
    .regex(/\d/, "گذرواژه باید حداقل یک رقم داشته باشد"),
  role: z.enum(["BUYER", "ARTISAN"]).default("BUYER"), // ADMIN can NEVER be registered publicly (M3)
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
  if (!(await rateLimit(`register|${await actionIp()}`, 6, 10 * 60_000))) {
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد دوباره تلاش کنید." };
  }
  const parsed = registerSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const { name, email, password, role, workshop, province } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
  // Generic message either way — no email-enumeration leak (Phase 3).
  if (existing) {
    return { ok: false, error: "ثبت‌نام با این مشخصات انجام‌پذیر نیست؛ اگر حساب دارید وارد شوید." };
  }
  const user = await db.user.create({
    data: {
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      name: name.trim(),
      role, // enum BUYER|ARTISAN only — the schema has no ADMIN path here
      shopTitle: role === "ARTISAN" && workshop ? workshop.trim() : null,
      province: province ? province.trim() : null,
      verified: false,
    },
  });
  if (role === "ARTISAN") {
    await db.memberRequest.create({
      data: {
        userId: user.id,
        workshop: workshop?.trim() || "کارگاه هنری",
        province: province?.trim() || "—",
        status: "PENDING",
      },
    });
    await db.auditLog.create({
      data: {
        actor: normalizedEmail,
        action: "MEMBER_REQUEST",
        target: workshop || name,
        detail: "درخواست پیوستن استادکار جدید",
      },
    });
  }
  await createSession(user.id);
  await mergeGuestCart(user.id);
  return {
    ok: true,
    message:
      role === "ARTISAN"
        ? "ثبت‌نام انجام شد؛ درخواست عضویت استادکار شما در صف بررسی است. تا تایید مدیریت می‌توانید پیش‌نویس اثر بسازید."
        : "ثبت‌نام با موفقیت انجام شد.",
  };
}

export async function loginAction(input: z.input<typeof loginSchema>): Promise<ActionResult> {
  const ip = await actionIp();
  const parsed = loginSchema.safeParse(input);
  const normalizedEmail = parsed.success ? parsed.data.email.trim().toLowerCase() : "";
  // Lockout per-IP and per-IP+account, then ONE generic message (no enumeration).
  if (!(await checkLoginAllowed(ip, normalizedEmail || "unknown"))) {
    return { ok: false, error: "تلاش‌های ناموفق بیش از حد مجاز؛ لطفاً کمی بعد دوباره تلاش کنید." };
  }
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const user = await db.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !verifyPassword(parsed.data.password, user.passwordHash)) {
    return { ok: false, error: "رایانامه یا گذرواژه نادرست است." };
  }
  if (user.suspended) {
    return { ok: false, error: "دسترسی این حساب توسط مدیریت ریشه به‌صورت موقت مسدود شده است." };
  }
  await createSession(user.id);
  await mergeGuestCart(user.id);
  return { ok: true };
}

export async function logoutAction(): Promise<ActionResult> {
  await destroySession();
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Phase 3 — password change (requires the CURRENT password), session mgmt
// ---------------------------------------------------------------------------

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "گذرواژه فعلی الزامی است"),
  newPassword: z
    .string()
    .min(8, "گذرواژه جدید باید حداقل ۸ نویسه باشد")
    .max(100)
    .regex(/[a-zA-Z]/, "گذرواژه باید حداقل یک حرف داشته باشد")
    .regex(/\d/, "گذرواژه باید حداقل یک رقم داشته باشد"),
});

export async function changePasswordAction(
  input: z.input<typeof changePasswordSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (!(await rateLimit(`chpass|${await actionIp()}`, 6, 10 * 60_000))) {
    return { ok: false, error: "تعداد تلاش‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const parsed = changePasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const row = await db.user.findUnique({ where: { id: user.id } });
  if (!row || !verifyPassword(parsed.data.currentPassword, row.passwordHash)) {
    return { ok: false, error: "گذرواژه فعلی نادرست است." };
  }
  await db.user.update({
    where: { id: user.id },
    data: { passwordHash: hashPassword(parsed.data.newPassword) },
  });
  // Invalidate every OTHER session (keep the current one).
  const { currentSessionId } = await listActiveSessions(user.id);
  const sessions = await db.session.findMany({ where: { userId: user.id }, select: { id: true } });
  const others = sessions.filter((s) => s.id !== currentSessionId);
  await db.session.deleteMany({ where: { id: { in: others.map((s) => s.id) } } });
  await db.auditLog.create({
    data: { actor: user.email, action: "PASSWORD_CHANGE", target: user.email, detail: "گذرواژه تغییر کرد؛ سایر نشست‌ها بسته شدند" },
  });
  return { ok: true, message: "گذرواژه تغییر کرد و همه‌ی نشست‌های دیگر بسته شدند." };
}

export async function logoutAllDevicesAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const count = await destroyAllSessions(user.id);
  await destroySession();
  return { ok: true, message: `از همه‌ی دستگاه‌ها خارج شدید (${count} نشست بسته شد).` };
}

export async function revokeSessionAction(sessionId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const session = await db.session.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) {
    return { ok: false, error: "نشست یافت نشد یا متعلق به شما نیست." };
  }
  await db.session.delete({ where: { id: sessionId } });
  const store = await import("next/headers").then((m) => m.cookies());
  const raw = store.get("risheh_session")?.value;
  const current = raw ? raw.split(".")[0] : null;
  if (current && current === session.token) {
    store.delete("risheh_session");
  }
  return { ok: true, message: "نشست انتخابی بسته شد." };
}

// ---------------------------------------------------------------------------

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

const artisanProfileSchema = z.object({
  shopTitle: z.string().min(3, "عنوان کارگاه الزامی است").max(120),
  province: z.string().max(40).optional().or(z.literal("")),
  bio: z.string().max(900).optional().or(z.literal("")),
  iban: z
    .string()
    .optional()
    .or(z.literal(""))
    .transform((v) => (v ? toEnDigits(v).replace(/\s/g, "").toUpperCase() : ""))
    .refine((v) => v === "" || /^IR\d{24}$/.test(v), "شماره شبا باید با IR و ۲۴ رقم باشد"),
});

export async function updateArtisanProfileAction(
  input: z.input<typeof artisanProfileSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "این بخش مخصوص استادکاران است." };
  }
  const parsed = artisanProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  await db.user.update({
    where: { id: user.id },
    data: {
      shopTitle: parsed.data.shopTitle.trim(),
      province: parsed.data.province?.trim() || null,
      bio: parsed.data.bio?.trim() || null,
      iban: parsed.data.iban || null,
    },
  });
  return { ok: true, message: "پروفایل کارگاه به‌روزرسانی شد." };
}
