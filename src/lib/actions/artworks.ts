"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser, rateLimit } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/auth";
import { toEnDigits } from "@/lib/fa";
import { invalidatePublicCatalog } from "@/lib/data";

const artworkSchema = z.object({
  title: z.string().min(3, "عنوان اثر الزامی است").max(150),
  categoryId: z.string().min(1, "دسته‌بندی الزامی است"),
  description: z.string().min(10, "توضیحات باید حداقل ۱۰ نویسه باشد").max(3000),
  story: z.string().max(4000).optional().or(z.literal("")),
  price: z
    .string()
    .transform((v) => toEnDigits(v).replace(/[,\s]/g, ""))
    .transform((v) => Number(v))
    .refine(
      (n) => Number.isInteger(n) && n >= 10000,
      "قیمت باید عدد صحیح و دست‌کم ۱۰,۰۰۰ تومان باشد"
    )
    .refine((n) => n <= 10_000_000_000, "حداکثر قیمت مجاز ۱۰,۰۰۰,۰۰۰,۰۰۰ تومان است"),
  materials: z.string().max(200).optional().or(z.literal("")),
  dimensions: z.string().max(120).optional().or(z.literal("")),
  province: z.string().max(40).optional().or(z.literal("")),
  images: z.array(z.string().max(400)).min(1, "دست‌کم یک تصویر الزامی است").max(8),
  stock: z.coerce.number().int().min(1, "موجودی باید دست‌کم ۱ باشد").max(99).default(1),
});

export type ArtworkInput = z.input<typeof artworkSchema> & { id?: string };

function generateCode(): string {
  return `RSH-${Math.floor(10000 + Math.random() * 89999)}`;
}

function slugify(title: string): string {
  const base = title.replace(/\s+/g, "-").replace(/[^\p{L}\p{N}-]/gu, "").slice(0, 40);
  return `${base || "artwork"}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

export async function createArtworkAction(
  input: ArtworkInput,
  publish: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "فقط استادکاران می‌توانند اثر ثبت کنند." };
  }
  const parsed = artworkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }

  // Image safety: only allow curated library paths (uploads require provider — documented)
  const safeImages = parsed.data.images.filter((i) => i.startsWith("/assets/img/"));
  if (safeImages.length === 0) {
    return { ok: false, error: "تصاویر باید از کتابخانه تصاویر ریشه انتخاب شوند." };
  }

  const category = await db.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return { ok: false, error: "دسته‌بندی یافت نشد." };

  const status = publish ? "PENDING" : "DRAFT";
  const artwork = await db.artwork.create({
    data: {
      code: generateCode(),
      slug: slugify(parsed.data.title),
      title: parsed.data.title.trim(),
      sellerId: user.id,
      categoryId: parsed.data.categoryId,
      description: parsed.data.description.trim(),
      story: parsed.data.story || null,
      price: parsed.data.price,
      images: JSON.stringify(safeImages),
      materials: parsed.data.materials || null,
      dimensions: parsed.data.dimensions || null,
      province: parsed.data.province || user.province || null,
      stock: parsed.data.stock,
      status,
    },
  });
  await db.authenticityRecord.create({
    data: {
      artworkId: artwork.id,
      hologramCode: `${artwork.code}-H${Math.floor(1000 + Math.random() * 8999)}`,
      status: "PENDING",
      labStatus: "QUEUED",
    },
  });
  await db.auditLog.create({
    data: {
      actor: user.email,
      action: publish ? "ARTWORK_SUBMIT" : "ARTWORK_DRAFT",
      target: artwork.code,
      detail: parsed.data.title,
    },
  });
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: publish ? "اثر برای بررسی و صدور شناسنامه ارسال شد." : "پیش‌نویس اثر ذخیره شد." };
}

export async function updateArtworkAction(
  id: string,
  input: ArtworkInput,
  publish: boolean
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };

  const artwork = await db.artwork.findUnique({ where: { id } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  // Server-side ownership check — hiding buttons is not authorization
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید و اجازه ویرایش آن را ندارید." };
  }

  const parsed = artworkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const safeImages = parsed.data.images.filter((i) => i.startsWith("/assets/img/"));
  if (safeImages.length === 0) {
    return { ok: false, error: "تصاویر باید از کتابخانه تصاویر ریشه انتخاب شوند." };
  }

  const nextStatus = publish
    ? artwork.status === "PUBLISHED"
      ? "PUBLISHED"
      : "PENDING"
    : artwork.status === "DRAFT"
      ? "DRAFT"
      : artwork.status;

  await db.artwork.update({
    where: { id },
    data: {
      title: parsed.data.title.trim(),
      categoryId: parsed.data.categoryId,
      description: parsed.data.description.trim(),
      story: parsed.data.story || null,
      price: parsed.data.price,
      images: JSON.stringify(safeImages),
      materials: parsed.data.materials || null,
      dimensions: parsed.data.dimensions || null,
      province: parsed.data.province || null,
      stock: parsed.data.stock,
      status: nextStatus,
    },
  });
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: "تغییرات اثر ذخیره شد." };
}

export async function setArtworkStatusAction(
  id: string,
  status: "DRAFT" | "PENDING" | "ARCHIVED"
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const artwork = await db.artwork.findUnique({ where: { id } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید." };
  }
  await db.artwork.update({ where: { id }, data: { status } });
  await db.auditLog.create({
    data: { actor: user.email, action: "ARTWORK_STATUS", target: artwork.code, detail: status },
  });
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: "وضعیت اثر تغییر یافت." };
}

export async function requestLabAction(input: {
  artworkId: string;
  kind: "SAMPLE_SEND" | "PHOTO_SESSION";
  preferredDate?: string;
  note?: string;
}): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const artwork = await db.artwork.findUnique({ where: { id: input.artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید." };
  }
  await db.labRequest.create({
    data: {
      artworkId: artwork.id,
      sellerId: user.id,
      kind: input.kind,
      preferredDate: input.preferredDate || null,
      note: input.note || null,
    },
  });
  revalidatePath("/");
  return { ok: true, message: "درخواست شما در آزمایشگاه اصالت ثبت شد." };
}

const settleSchema = z.object({
  amount: z.coerce.number().int().min(100000, "حداقل مبلغ تسویه ۱۰۰,۰۰۰ تومان است"),
  iban: z
    .string()
    .transform((v) => toEnDigits(v).replace(/\s/g, "").toUpperCase())
    .pipe(
      z
        .string()
        .regex(/^IR\d{24}$/, "شماره شبا باید با IR و ۲۴ رقم باشد (مثال: IR420170000000123456789001)")
    ),
});

export async function requestSettlementAction(
  input: z.input<typeof settleSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "تسویه فقط برای استادکاران فعال است." };
  }
  if (!rateLimit(`settle:${user.id}`, 5, 60_000)) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است." };
  }
  const parsed = settleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }

  // Balance must cover the request — computed from ledger, server-side
  const entries = await db.ledgerEntry.findMany({ where: { sellerId: user.id } });
  const balance = entries
    .filter((e) => e.status === "CLEARED")
    .reduce((s, e) => s + e.amount, 0);
  const pendingSettlements = await db.settlementRequest.aggregate({
    where: { sellerId: user.id, status: { in: ["PENDING", "APPROVED"] } },
    _sum: { amount: true },
  });
  const available = balance - (pendingSettlements._sum.amount ?? 0);
  if (parsed.data.amount > available) {
    return {
      ok: false,
      error: `مبلغ درخواستی از موجودی قابل تسویه (${available.toLocaleString("fa-IR")} تومان) بیشتر است.`,
    };
  }

  await db.settlementRequest.create({
    data: { sellerId: user.id, amount: parsed.data.amount, iban: parsed.data.iban },
  });
  await db.auditLog.create({
    data: { actor: user.email, action: "SETTLE_REQUEST", target: user.shopTitle || user.name, detail: `${parsed.data.amount.toLocaleString("fa-IR")} تومان` },
  });
  revalidatePath("/");
  return { ok: true, message: "درخواست تسویه ثبت شد و پس از بررسی مدیریت پرداخت می‌شود." };
}
