"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, dbRetry } from "@/lib/db";
import { getCurrentUser, rateLimit } from "@/lib/session";
import { invalidatePublicCatalog } from "@/lib/data";
import type { ActionResult } from "@/lib/actions/auth";
import type { DiscountStatus } from "@/lib/types";
import { toEnDigits, DISCOUNT_STATUS_FA, discountValueFa } from "@/lib/fa";

/**
 * Discount actions — occasion campaigns, discount codes and redemptions.
 *
 * Admin operations re-check the ADMIN role on the server (like admin.ts).
 * User operations (check / claim / artisan campaign participation) are
 * validated server-side; client role values are never trusted.
 */

// ---------- shared helpers ----------

function normalizeCode(raw: string): string {
  return toEnDigits(raw).trim().toUpperCase().replace(/\s+/g, "-");
}

async function audit(actor: string, action: string, target: string, detail?: string) {
  await db.auditLog.create({ data: { actor, action, target, detail } });
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") return null;
  return user;
}

export type DiscountCheckResult =
  | { ok: true; status: "VALID"; message: string; info: DiscountInfo }
  | { ok: true; status: DiscountStatus; message: string }
  | { ok: false; error: string };

export type DiscountInfo = {
  code: string;
  title: string;
  kind: "PERCENT" | "FIXED";
  amount: number;
  maxPrice?: number | null;
  minPrice?: number | null;
  audience: string;
  remaining: number;
  perUserLimit: number;
  myUses: number;
  expiresAt?: string | null;
  campaignTitle?: string | null;
};

/** Server-side validity evaluation shared by check + claim. */
async function evaluateCode(rawCode: string, userId: string | null, userRole: string | null) {
  const code = await db.discountCode.findUnique({
    where: { code: normalizeCode(rawCode) },
    include: { campaign: true },
  });
  if (!code) {
    return {
      status: "NOT_FOUND" as DiscountStatus,
      message: DISCOUNT_STATUS_FA.NOT_FOUND,
      code: null,
    };
  }

  const now = new Date();
  if (!code.active) {
    return { status: "INACTIVE" as DiscountStatus, message: DISCOUNT_STATUS_FA.INACTIVE, code: null };
  }
  if (code.startsAt && code.startsAt.getTime() > now.getTime()) {
    return { status: "NOT_STARTED" as DiscountStatus, message: DISCOUNT_STATUS_FA.NOT_STARTED, code: null };
  }
  if (code.expiresAt && code.expiresAt.getTime() < now.getTime()) {
    return { status: "EXPIRED" as DiscountStatus, message: DISCOUNT_STATUS_FA.EXPIRED, code: null };
  }
  if (code.usedCount >= code.maxUses) {
    return { status: "EXHAUSTED" as DiscountStatus, message: DISCOUNT_STATUS_FA.EXHAUSTED, code: null };
  }
  if (userRole && code.audience !== "ALL" && code.audience !== userRole) {
    return {
      status: "AUDIENCE_MISMATCH" as DiscountStatus,
      message: DISCOUNT_STATUS_FA.AUDIENCE_MISMATCH,
      code: null,
    };
  }

  let myUses = 0;
  if (userId) {
    myUses = await db.discountRedemption.count({ where: { codeId: code.id, userId } });
    if (myUses >= code.perUserLimit) {
      return {
        status: "USER_LIMIT" as DiscountStatus,
        message: DISCOUNT_STATUS_FA.USER_LIMIT,
        code: null,
      };
    }
  }

  return {
    status: "VALID" as DiscountStatus,
    message: `کد معتبر است — ${discountValueFa(code.kind, code.amount)} روی کدهای واجد شرایط`,
    code,
    myUses,
  };
}

// ---------- user actions (storefront) ----------

export async function checkDiscountCodeAction(rawCode: string): Promise<DiscountCheckResult> {
  const user = await getCurrentUser();
  const trimmed = rawCode?.trim();
  if (!trimmed) return { ok: false, error: "کد تخفیف را وارد کنید." };

  // Light abuse protection for the public endpoint.
  if (!rateLimit(`discount-check:${user?.id ?? "guest"}`, 12, 30_000)) {
    return { ok: false, error: "درخواست‌های بیش از حد؛ کمی بعد دوباره تلاش کنید." };
  }

  const res = await evaluateCode(trimmed, user?.id ?? null, user?.role ?? null);
  if (res.status !== "VALID" || !res.code) {
    return { ok: true, status: res.status, message: res.message };
  }

  const info: DiscountInfo = {
    code: res.code.code,
    title: res.code.title,
    kind: res.code.kind as "PERCENT" | "FIXED",
    amount: res.code.amount,
    maxPrice: res.code.maxPrice,
    minPrice: res.code.minPrice,
    audience: res.code.audience,
    remaining: Math.max(0, res.code.maxUses - res.code.usedCount),
    perUserLimit: res.code.perUserLimit,
    myUses: res.myUses,
    expiresAt: res.code.expiresAt?.toISOString() ?? null,
    campaignTitle: res.code.campaign?.title ?? null,
  };
  if (!user) {
    return { ok: true, status: "VALID", message: `${res.message} — برای دریافت، وارد حساب خود شوید.`, info };
  }
  return { ok: true, status: "VALID", message: res.message, info };
}

export async function claimDiscountCodeAction(rawCode: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "برای دریافت کد تخفیف ابتدا وارد حساب خود شوید." };
  if (user.role === "ADMIN") {
    return { ok: false, error: "کدهای تخفیف برای مشتریان و استادکاران صادر می‌شود؛ حساب مدیریتی نمی‌تواند کد دریافت کند." };
  }

  const trimmed = rawCode?.trim();
  if (!trimmed) return { ok: false, error: "کد تخفیف را وارد کنید." };
  if (!rateLimit(`discount-claim:${user.id}`, 10, 30_000)) {
    return { ok: false, error: "درخواست‌های بیش از حد؛ کمی بعد دوباره تلاش کنید." };
  }

  const res = await evaluateCode(trimmed, user.id, user.role);
  if (res.status !== "VALID" || !res.code) {
    return { ok: false, error: res.message };
  }

  await db.discountRedemption.create({
    data: { codeId: res.code.id, userId: user.id, status: "CLAIMED" },
  });
  await db.discountCode.update({
    where: { id: res.code.id },
    data: { usedCount: { increment: 1 } },
  });

  revalidatePath("/");
  return {
    ok: true,
    message: `کد «${res.code.code}» برای حساب شما ثبت شد — از بخش «کدهای من» وضعیت آن را دنبال کنید.`,
  };
}

/** Artisan participation: pin one of my published artworks to an open campaign. */
export async function joinCampaignAction(
  campaignId: string,
  artworkId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب خود شوید." };
  if (user.role !== "ARTISAN") {
    return { ok: false, error: "مشارکت در کمپین‌های مناسبت‌دار ویژه استادکاران است." };
  }

  const artwork = await db.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id) {
    return { ok: false, error: "تنها آثار خودتان را می‌توانید به کمپین اضافه کنید." };
  }
  if (artwork.status !== "PUBLISHED") {
    return { ok: false, error: "فقط آثار منتشرشده قابل عرضه در کمپین هستند." };
  }

  const campaign = await db.discountCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "کمپین یافت نشد." };
  if (!campaign.active || campaign.endsAt.getTime() < Date.now()) {
    return { ok: false, error: "این کمپین دیگر پذیرای اثر جدید نیست." };
  }

  const exists = await db.discountArtwork.findUnique({
    where: { campaignId_artworkId: { campaignId, artworkId } },
  });
  if (exists) return { ok: false, error: "این اثر از قبل در کمپین حاضر است." };

  await db.discountArtwork.create({ data: { campaignId, artworkId } });
  await audit(user.email, "DISCOUNT_JOIN", artwork.code, `مشارکت در کمپین ${campaign.title}`);
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: `اثر «${artwork.title}» به کمپین «${campaign.title}» افزوده شد.` };
}

/** Artisan leaves a campaign (only for own artworks). */
export async function leaveCampaignAction(
  campaignId: string,
  artworkId: string
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب خود شوید." };
  if (user.role !== "ARTISAN") {
    return { ok: false, error: "این عملیات ویژه استادکاران است." };
  }

  const link = await db.discountArtwork.findUnique({
    where: { campaignId_artworkId: { campaignId, artworkId } },
    include: { artwork: true, campaign: true },
  });
  if (!link) return { ok: false, error: "این اثر در کمپین حاضر نیست." };
  if (link.artwork.sellerId !== user.id) {
    return { ok: false, error: "تنها آثار خودتان را می‌توانید از کمپین خارج کنید." };
  }

  await db.discountArtwork.delete({ where: { id: link.id } });
  await audit(user.email, "DISCOUNT_LEAVE", link.artwork.code, `خروج از کمپین ${link.campaign.title}`);
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: `اثر «${link.artwork.title}» از کمپین خارج شد.` };
}

// ---------- admin actions ----------

const campaignSchema = z.object({
  title: z.string().min(3, "عنوان کمپین باید حداقل ۳ نویسه باشد").max(80),
  occasion: z.string().min(2, "مناسبت را مشخص کنید").max(60),
  description: z.string().max(300).optional(),
  days: z.number().int().min(1).max(365),
  artworkIds: z.array(z.string()).min(1, "حداقل یک اثر را برای کمپین انتخاب کنید").max(24),
});

export async function createDiscountCampaignAction(
  input: z.infer<typeof campaignSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const parsed = campaignSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است." };
  }
  const { title, occasion, description, days, artworkIds } = parsed.data;

  const artworks = await db.artwork.findMany({
    where: { id: { in: artworkIds }, status: "PUBLISHED" },
    select: { id: true, title: true },
  });
  if (artworks.length === 0) {
    return { ok: false, error: "هیچ‌کدام از آثار انتخابی معتبر/منتشرشده نیست." };
  }

  const now = new Date();
  const endsAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  const campaign = await db.discountCampaign.create({
    data: {
      title,
      occasion,
      description: description || null,
      startsAt: now,
      endsAt,
      artworks: { create: artworks.map((a) => ({ artworkId: a.id })) },
    },
  });

  await audit(
    admin.email,
    "DISCOUNT_CAMPAIGN_CREATE",
    campaign.title,
    `${occasion} — ${artworks.length} اثر، مهلت ${days} روز`
  );
  invalidatePublicCatalog();
  revalidatePath("/");
  return {
    ok: true,
    message: `کمپین «${title}» برای مناسبت «${occasion}» با ${artworks.length} اثر ساخته شد.`,
  };
}

export async function toggleDiscountCampaignAction(
  campaignId: string,
  active: boolean
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const campaign = await db.discountCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "کمپین یافت نشد." };

  await db.discountCampaign.update({ where: { id: campaignId }, data: { active } });
  await audit(admin.email, active ? "DISCOUNT_CAMPAIGN_ON" : "DISCOUNT_CAMPAIGN_OFF", campaign.title);
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: active ? "کمپین فعال شد." : "کمپین غیرفعال شد." };
}

export async function deleteDiscountCampaignAction(campaignId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const campaign = await db.discountCampaign.findUnique({ where: { id: campaignId } });
  if (!campaign) return { ok: false, error: "کمپین یافت نشد." };

  await db.discountCampaign.delete({ where: { id: campaignId } });
  await audit(admin.email, "DISCOUNT_CAMPAIGN_DELETE", campaign.title, campaign.occasion);
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: `کمپین «${campaign.title}» حذف شد (کدها مستقل باقی می‌مانند).` };
}

export async function removeCampaignArtworkAction(
  campaignId: string,
  artworkId: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const link = await db.discountArtwork.findUnique({
    where: { campaignId_artworkId: { campaignId, artworkId } },
    include: { artwork: true },
  });
  if (!link) return { ok: false, error: "این اثر در کمپین حاضر نیست." };

  await db.discountArtwork.delete({ where: { id: link.id } });
  await audit(admin.email, "DISCOUNT_CAMPAIGN_REMOVE", link.artwork.code, "حذف اثر از کمپین");
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: "اثر از کمپین حذف شد." };
}

const codeSchema = z
  .object({
    code: z
      .string()
      .min(3, "کد باید حداقل ۳ نویسه باشد")
      .max(24, "کد باید حداکثر ۲۴ نویسه باشد")
      .regex(/^[A-Za-z0-9-]+$/, "کد فقط حروف انگلیسی، عدد و خط تیره"),
    title: z.string().min(2, "عنوان کد را وارد کنید").max(80),
    description: z.string().max(300).optional(),
    kind: z.enum(["PERCENT", "FIXED"]),
    amount: z.number().int().min(1, "مقدار باید مثبت باشد").max(100_000_000),
    maxPrice: z.number().int().min(0).max(100_000_000).optional(),
    minPrice: z.number().int().min(0).max(1_000_000_000).optional(),
    audience: z.enum(["ALL", "BUYER", "ARTISAN"]),
    maxUses: z.number().int().min(1, "ظرفیت باید حداقل ۱ باشد").max(100_000),
    perUserLimit: z.number().int().min(1, "سهمیه هر کاربر حداقل ۱ است").max(10),
    campaignId: z.string().optional(),
    days: z.number().int().min(1).max(730).optional(), // expiry window from now (optional = no expiry)
  })
  .refine((v) => v.kind !== "PERCENT" || v.amount <= 100, {
    message: "درصد تخفیف باید بین ۱ تا ۱۰۰ باشد",
    path: ["amount"],
  })
  .refine((v) => v.kind !== "PERCENT" || v.maxPrice === undefined || v.maxPrice > 0, {
    message: "سقف تخفیف نامعتبر است",
    path: ["maxPrice"],
  });

export async function createDiscountCodeAction(
  input: z.infer<typeof codeSchema>
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const parsed = codeSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است." };
  }
  const v = parsed.data;
  const codeText = normalizeCode(v.code);

  const dup = await db.discountCode.findUnique({ where: { code: codeText } });
  if (dup) return { ok: false, error: "این کد قبلاً ثبت شده است؛ کد دیگری انتخاب کنید." };

  if (v.campaignId) {
    const campaign = await db.discountCampaign.findUnique({ where: { id: v.campaignId } });
    if (!campaign) return { ok: false, error: "کمپین انتخابی یافت نشد." };
  }

  await db.discountCode.create({
    data: {
      code: codeText,
      title: v.title,
      description: v.description || null,
      kind: v.kind,
      amount: v.amount,
      maxPrice: v.kind === "PERCENT" ? (v.maxPrice ?? null) : null,
      minPrice: v.minPrice ?? null,
      audience: v.audience,
      maxUses: v.maxUses,
      perUserLimit: v.perUserLimit,
      campaignId: v.campaignId || null,
      expiresAt: v.days ? new Date(Date.now() + v.days * 24 * 60 * 60 * 1000) : null,
    },
  });

  await audit(
    admin.email,
    "DISCOUNT_CODE_CREATE",
    codeText,
    `${discountValueFa(v.kind, v.amount)} — مخاطب ${v.audience} — ظرفیت ${v.maxUses}`
  );
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: `کد «${codeText}» ساخته و فعال شد.` };
}

export async function toggleDiscountCodeAction(
  codeId: string,
  active: boolean
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const code = await db.discountCode.findUnique({ where: { id: codeId } });
  if (!code) return { ok: false, error: "کد یافت نشد." };

  await db.discountCode.update({ where: { id: codeId }, data: { active } });
  await audit(admin.email, active ? "DISCOUNT_CODE_ON" : "DISCOUNT_CODE_OFF", code.code);
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: active ? "کد فعال شد." : "کد غیرفعال شد." };
}

export async function deleteDiscountCodeAction(codeId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const code = await db.discountCode.findUnique({ where: { id: codeId } });
  if (!code) return { ok: false, error: "کد یافت نشد." };

  await db.discountCode.delete({ where: { id: codeId } });
  await audit(admin.email, "DISCOUNT_CODE_DELETE", code.code, code.title);
  invalidatePublicCatalog();
  revalidatePath("/");
  return { ok: true, message: `کد «${code.code}» حذف شد.` };
}

export async function resetCodeUsageAction(codeId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const code = await db.discountCode.findUnique({ where: { id: codeId } });
  if (!code) return { ok: false, error: "کد یافت نشد." };

  // Atomic reset, with transient-error retry (deadlock / pool timeout safe).
  await dbRetry(() =>
    db.$transaction([
      db.discountRedemption.deleteMany({ where: { codeId } }),
      db.discountCode.update({ where: { id: codeId }, data: { usedCount: 0 } }),
    ])
  );
  await audit(admin.email, "DISCOUNT_CODE_RESET", code.code, "صفری‌سازی شمارش استفاده");
  revalidatePath("/");
  return { ok: true, message: `شمارش استفاده از کد «${code.code}» صفر شد.` };
}
