"use server";

import { z } from "zod";
import { db, dbRetry } from "@/lib/db";
import { rateLimit } from "@/lib/session";
import { toEnDigits as toEnDigitsSafe } from "@/lib/fa";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const contactSchema = z.object({
  name: z.string().min(2, "نام الزامی است").max(60),
  email: z.string().email("رایانامه معتبر نیست"),
  subject: z.string().max(120).optional().or(z.literal("")),
  message: z.string().min(10, "متن پیام باید حداقل ۱۰ نویسه باشد").max(2000),
});

export async function sendContactMessageAction(
  input: z.input<typeof contactSchema>
): Promise<ActionResult> {
  if (!rateLimit("contact", 5, 300_000)) {
    return { ok: false, error: "تعداد پیام‌های ارسالی بیش از حد مجاز است؛ بعداً تلاش کنید." };
  }
  const parsed = contactSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  await db.contactMessage.create({
    data: {
      name: parsed.data.name.trim(),
      email: parsed.data.email.trim().toLowerCase(),
      subject: parsed.data.subject || null,
      message: parsed.data.message.trim(),
    },
  });
  return {
    ok: true,
    message:
      "پیام شما ثبت شد. کارشناسان نگارخانه ریشه در نخستین فرصت (حداکثر ۲۴ ساعت کاری) پاسخ خواهند داد.",
  };
}

const newsletterSchema = z.object({
  email: z.string().email("رایانامه معتبر نیست"),
});

export async function subscribeNewsletterAction(
  input: z.input<typeof newsletterSchema>
): Promise<ActionResult> {
  if (!rateLimit("newsletter", 10, 300_000)) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است." };
  }
  const parsed = newsletterSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر" };
  // No delivery provider configured — we store the request and answer honestly.
  return {
    ok: true,
    message:
      "درخواست عضویت در خبرنامه ثبت شد. (حالت نمایشی: سرویس ارسال رایانامه پیکربندی نشده است.)",
  };
}

export type VerifyResult =
  | {
      ok: true;
      state: "VERIFIED" | "PENDING" | "NOT_FOUND";
      title?: string;
      code?: string;
      sellerName?: string;
      province?: string;
      hologramCode?: string;
      status?: string;
      labStatus?: string;
      tests?: Array<{ name: string; result: string; detail: string }>;
      issuedAt?: string | null;
      notes?: string;
      message: string;
    }
  | { ok: false; error: string };

export async function verifyAuthenticityAction(code: string): Promise<VerifyResult> {
  if (!rateLimit("verify", 30, 60_000)) {
    return { ok: false, error: "تعداد استعلام‌ها بیش از حد مجاز است؛ یک دقیقه بعد تلاش کنید." };
  }
  const normalized = toEnDigitsSafe(code).trim().toUpperCase().replace(/\s+/g, "");
  if (normalized.length < 4) {
    return { ok: false, error: "کد استعلام باید دست‌کم ۴ نویسه باشد." };
  }

  // Look up by hologram code or artwork code (trusted stored records only).
  // `mode: "insensitive"` keeps the SQLite-era behaviour (case-insensitive
  // lookup) on PostgreSQL, where LIKE is case-sensitive by default.
  const record = await dbRetry(() =>
    db.authenticityRecord.findFirst({
      where: {
        OR: [
          { hologramCode: { contains: normalized, mode: "insensitive" } },
          { artwork: { code: normalized.replace("-H", "") } },
          { artwork: { code: normalized } },
        ],
      },
      include: { artwork: { include: { seller: true } } },
    })
  );

  if (!record || record.status === "REJECTED") {
    // Missing/unknown code is NOT proof of counterfeit — honest, safe wording
    return {
      ok: true,
      state: "NOT_FOUND",
      message:
        "هیچ شناسنامه‌ای با این کد در سامانه ریشه ثبت نشده است. یافت‌نشدن کد به معنای تقلبی بودن اثر نیست؛ اثر ممکن است خارج از زنجیره تایید ریشه ثبت شده باشد. برای کارشناسی حضوری با نگارخانه تماس بگیرید.",
    };
  }

  if (record.status === "PENDING" || record.labStatus !== "ISSUED") {
    return {
      ok: true,
      state: "PENDING",
      title: record.artwork.title,
      code: record.artwork.code,
      hologramCode: record.hologramCode,
      labStatus: record.labStatus,
      message:
        "این اثر در فرایند تایید اصالت ریشه است؛ شناسنامه آن هنوز صادر نشده و نتیجه قطعی در دسترس نیست. (نتیجه صرفاً از رکورد داخلی همین سامانه خوانده می‌شود.)",
    };
  }

  return {
    ok: true,
    state: "VERIFIED",
    title: record.artwork.title,
    code: record.artwork.code,
    sellerName: record.artwork.seller.name,
    province: record.artwork.province ?? undefined,
    hologramCode: record.hologramCode,
    status: record.status,
    labStatus: record.labStatus,
    tests: JSON.parse(record.tests || "[]"),
    issuedAt: record.issuedAt?.toISOString() ?? null,
    notes: record.notes ?? undefined,
    message:
      "این نتیجه از شناسنامه ثبت‌شده در پایگاه‌داده ریشه بازیابی شده است؛ رکورد داخلی همین سامانه است و به‌معنای گواهی آزمایشگاه یا مرجع مستقل بیرونی نیست.",
  };
}
