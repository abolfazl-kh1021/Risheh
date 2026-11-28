"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, dbTx } from "@/lib/db";
import { getCurrentUser, actionIp } from "@/lib/session";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions/auth";
import { toEnDigits } from "@/lib/fa";
import { invalidatePublicCatalog } from "@/lib/data";
import { assertTransition, LISTING_MACHINE } from "@/lib/state-machines";
import { getNumberSetting, getBoolSetting } from "@/lib/settings";
import { uniqueArtworkCode, uniqueArtworkSlug } from "@/lib/ids";
import { normalizeImagePath } from "@/lib/image-safety";
import { getPaymentProvider } from "@/lib/payments";
import { effectivePlan } from "@/lib/payments/finalize";
import { uniqueInvoiceNumber } from "@/lib/ids";
import { notify } from "@/lib/notify";

/**
 * Artworks (آگهی) — C2C listing lifecycle (M4, §۴.۲).
 *
 *  DRAFT (رایگان) → [submitForReview: fee invoice] → PENDING_REVIEW (پس از پرداخت در صف ادمین)
 *  → PUBLISHED (تایید ادمین؛ expiresAt = LISTING_ACTIVE_DAYS)
 *  → EXPIRED | ARCHIVED | SOLD  —  REJECTED (با دلیل؛ ویرایش و ارسال دوباره)
 *
 * Material edits of a PUBLISHED listing send it back to PENDING_REVIEW and
 * re-open its authenticity record; price/stock edits stay without review.
 * Listing cap + listing fee are enforced SERVER-SIDE from the seller's plan.
 */

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

/** Fields whose change is «مادی» — they invalidate the authenticity record. */
const MATERIAL_FIELDS = ["title", "description", "story", "images", "materials", "dimensions"] as const;

function materialSignature(input: {
  title: string;
  description: string;
  story?: string | null;
  images: string[];
  materials?: string | null;
  dimensions?: string | null;
}): string {
  return JSON.stringify([
    input.title,
    input.description,
    input.story ?? "",
    input.images,
    input.materials ?? "",
    input.dimensions ?? "",
  ]);
}

async function requireArtisan(user: { id: string; role: string }): Promise<ActionResult | null> {
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "فقط استادکاران می‌توانند اثر ثبت کنند." };
  }
  // Waiting-approval artisans may draft but not submit/publish.
  if (user.role === "ARTISAN") {
    const mr = await db.memberRequest.findUnique({ where: { userId: user.id } });
    if (mr?.status === "PENDING") {
      return { ok: false, error: "ثبت‌نام شما در صف تایید مدیریت است؛ تا زمان تایید می‌توانید پیش‌نویس بسازید ولی ارسال برای بازبینی فعال نیست." };
    }
  }
  return null;
}

export async function createArtworkAction(input: ArtworkInput): Promise<ActionResult> {
  const user = await getCurrentUser();
  const guard = user ? await requireArtisan(user) : { ok: false, error: "ابتدا وارد حساب شوید." };
  if (guard) return guard;
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };

  const parsed = artworkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  // Image safety: normalize + whitelist library/upload paths server-side.
  const safeImages = parsed.data.images
    .map(normalizeImagePath)
    .filter((i): i is string => i !== null);
  if (safeImages.length === 0) {
    return { ok: false, error: "تصاویر باید از کتابخانه تصاویر ریشه یا آپلود امن انتخاب شوند." };
  }
  const category = await db.category.findUnique({ where: { id: parsed.data.categoryId } });
  if (!category) return { ok: false, error: "دسته‌بندی یافت نشد." };

  const artwork = await db.artwork.create({
    data: {
      code: await uniqueArtworkCode(),
      slug: await uniqueArtworkSlug(parsed.data.title),
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
      status: "DRAFT", // پیش‌نویس رایگان — fee only on submit
    },
  });
  await db.authenticityRecord.create({
    data: { artworkId: artwork.id, hologramCode: `${artwork.code}-H${1000 + (Date.now() % 9000)}`, status: "PENDING", labStatus: "QUEUED" },
  });
  await db.auditLog.create({
    data: { actor: user.email, action: "ARTWORK_DRAFT", target: artwork.code, detail: parsed.data.title },
  });
  invalidatePublicCatalog();
  revalidatePath("/dashboard/artworks");
  return { ok: true, message: "پیش‌نویس اثر ذخیره شد. برای ورود به صف بازبینی، «ارسال برای بازبینی» را بزنید." };
}

export async function updateArtworkAction(
  id: string,
  input: ArtworkInput
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };

  const artwork = await db.artwork.findUnique({ where: { id }, include: { authenticity: true } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید و اجازه ویرایش آن را ندارید." };
  }

  const parsed = artworkSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }
  const safeImages = parsed.data.images
    .map(normalizeImagePath)
    .filter((i): i is string => i !== null);
  if (safeImages.length === 0) {
    return { ok: false, error: "تصاویر باید از کتابخانه تصاویر ریشه یا آپلود امن انتخاب شوند." };
  }

  // Material-change detection (known-issue fix: PUBLISHED edit kept status).
  const nextSig = materialSignature({
    title: parsed.data.title.trim(),
    description: parsed.data.description.trim(),
    story: parsed.data.story || null,
    images: safeImages,
    materials: parsed.data.materials || null,
    dimensions: parsed.data.dimensions || null,
  });
  const prevSig = materialSignature({
    title: artwork.title,
    description: artwork.description,
    story: artwork.story,
    images: (JSON.parse(artwork.images || "[]") as string[]),
    materials: artwork.materials,
    dimensions: artwork.dimensions,
  });
  const materialChanged = nextSig !== prevSig;

  let nextStatus = artwork.status;
  let authenticityReset = false;
  if (materialChanged && artwork.status === "PUBLISHED") {
    nextStatus = "PENDING_REVIEW";
    authenticityReset = true;
  } else if (materialChanged && artwork.status === "EXPIRED") {
    nextStatus = "EXPIRED"; // expired listings stay expired; renewal path is explicit
  } else if (artwork.status === "REJECTED") {
    nextStatus = "REJECTED"; // keep REJECTED until the seller resubmits explicitly
  }

  await dbTx(async (tx) => {
    await tx.artwork.update({
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
        ...(authenticityReset ? { reviewNote: null } : {}),
      },
    });
    // Material edit invalidates the digital record → re-open review (§۴.۲).
    if (authenticityReset && artwork.authenticity) {
      assertTransition(LISTING_MACHINE, "listing", artwork.status, "PENDING_REVIEW");
      await tx.authenticityRecord.update({
        where: { artworkId: artwork.id },
        data: { status: "PENDING", labStatus: "QUEUED", issuedAt: null, inspector: null },
      });
      await tx.verificationEvent.create({
        data: {
          recordId: artwork.authenticity.id,
          actor: user.email,
          action: "REOPEN",
          detail: "ویرایش مادی اثر؛ شناسنامه اصالت نیازمند بازبینی دوباره است.",
        },
      });
    }
    await tx.auditLog.create({
      data: {
        actor: user.email,
        action: materialChanged ? "ARTWORK_EDIT_MATERIAL" : "ARTWORK_EDIT",
        target: artwork.code,
        detail: materialChanged ? "ویرایش مادی — بازگشت به بازبینی" : "ویرایش قیمت/موجودی",
      },
    });
  });

  invalidatePublicCatalog();
  revalidatePath("/dashboard/artworks");
  return {
    ok: true,
    message: materialChanged
      ? "تغییرات مادی اثر ذخیره شد؛ اثر برای بازبینی و بازبینی شناسنامه اصالت به صف مدیریت برگشت."
      : "تغییرات اثر ذخیره شد (قیمت/موجودی بدون نیاز به بازبینی).",
  };
}

// ---------------------------------------------------------------------------
// Submit for review — enforces plan cap + listing fee invoice (§۴.۳)
// ---------------------------------------------------------------------------

export async function submitForReviewAction(artworkId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (!(await rateLimit(`submit|${actionIp()}`, 15, 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const guard = await requireArtisan(user);
  if (guard) return guard;

  const artwork = await db.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید." };
  }
  const from = ["DRAFT", "REJECTED", "EXPIRED"].includes(artwork.status)
    ? artwork.status
    : null;
  if (!from) {
    return { ok: false, error: "این اثر در وضعیت قابل ارسال نیست." };
  }

  const plan = await effectivePlan(user.id);
  const fee = plan.listingFeeToman;

  // Plan cap enforcement (server-side) — count ACTIVE listings in the window.
  if (plan.maxActiveListings !== null) {
    const activeCount = await db.artwork.count({
      where: { sellerId: user.id, status: { in: ["PUBLISHED", "PENDING_REVIEW"] } },
    });
    if (activeCount >= plan.maxActiveListings) {
      return {
        ok: false,
        error: `سقف آگهی پلن «${plan.title}» شما (${plan.maxActiveListings} آگهی فعال) تکمیل است — برای ادامه، پلن خود را ارتقا دهید یا آگهی‌های فعلی را بایگانی کنید.`,
      };
    }
  }

  // Listing fee → invoice → demo payment → then the admin queue.
  // Free-fee plans (طلایی) submit directly into the review queue.
  if (fee === 0) {
    assertTransition(LISTING_MACHINE, "listing", from, "PENDING_REVIEW");
    await dbTx(async (tx) => {
      await tx.artwork.update({
        where: { id: artwork.id },
        data: { status: "PENDING_REVIEW", reviewNote: null },
      });
      await tx.auditLog.create({
        data: { actor: user.email, action: "ARTWORK_SUBMIT", target: artwork.code, detail: "بدون کارمزد (پلن طلایی)" },
      });
    });
    invalidatePublicCatalog();
    revalidatePath("/dashboard/artworks");
    return { ok: true, message: "اثر برای بازبینی ارسال شد (پلن شما بدون کارمزد ثبت است)." };
  }

  const provider = getPaymentProvider();
  let authority: string;
  try {
    const req = await provider.request({
      invoiceOrOrderId: artwork.code,
      amount: fee,
      callbackUrl: "/api/payment/callback",
      description: `کارمزد ثبت آگهی «${artwork.title}»`,
    });
    authority = req.authority;
  } catch {
    return { ok: false, error: "اتصال به درگاه پرداخت ناموفق بود؛ کمی بعد تلاش کنید." };
  }

  await dbTx(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        number: await uniqueInvoiceNumber(),
        payerId: user.id,
        kind: "LISTING_FEE",
        status: "PENDING",
        amount: fee,
        description: `کارمزد ثبت آگهی «${artwork.title}» (${artwork.code})`,
        listingId: artwork.id,
      },
    });
    await tx.paymentAttempt.create({
      data: {
        invoiceId: invoice.id,
        provider: provider.name,
        authority,
        amount: fee,
        status: "PENDING",
      },
    });
    await tx.auditLog.create({
      data: {
        actor: user.email,
        action: "LISTING_FEE_INVOICE",
        target: artwork.code,
        detail: `${fee.toLocaleString("fa-IR")} تومان — پلن ${plan.title}`,
      },
    });
  });

  revalidatePath("/dashboard/artworks");
  return {
    ok: true,
    message: `کارمزد ثبت آگهی این پلن ${fee.toLocaleString("fa-IR")} تومان است؛ پس از پرداخت نمایشی، اثر وارد صف بازبینی می‌شود.`,
  };
}

/**
 * Same as submitForReviewAction but returns the redirect URL for the gateway.
 * (Actions returning strings are awkward for typed routes; this variant is
 * used by the dashboard UI.)
 */
export async function submitForReviewWithPayAction(
  artworkId: string
): Promise<{ ok: true; redirectUrl: string | null; message: string } | { ok: false; error: string }> {
  const before = await getCurrentUser();
  if (!before) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const artwork = await db.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };

  // Detect whether a fee is needed without paying twice.
  const plan = await effectivePlan(before.id);
  const needsFee = plan.listingFeeToman > 0;
  const pendingInvoice = await db.invoice.findFirst({
    where: { listingId: artworkId, kind: "LISTING_FEE", status: "PENDING" },
    include: { attempts: { where: { status: "PENDING" } } },
  });
  if (pendingInvoice && pendingInvoice.attempts.length > 0) {
    // Resume an existing unpaid attempt (never create a duplicate).
    return {
      ok: true,
      redirectUrl: `/pay/demo/${encodeURIComponent(pendingInvoice.attempts[0].authority)}`,
      message: "فاکتور کارمزد ثبت آگهی در انتظار پرداخت است.",
    };
  }

  const res = await submitForReviewAction(artworkId);
  if (!res.ok) return res;
  if (!needsFee) return { ok: true, redirectUrl: null, message: res.message ?? "ارسال شد" };
  const attempt = await db.paymentAttempt.findFirst({
    where: { invoice: { listingId: artworkId, kind: "LISTING_FEE" }, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
  if (!attempt) return { ok: false, error: "فاکتور پرداخت یافت نشد." };
  return { ok: true, redirectUrl: `/pay/demo/${encodeURIComponent(attempt.authority)}`, message: res.message ?? "" };
}

// ---------------------------------------------------------------------------
// Admin review decisions + seller resubmit + archive
// ---------------------------------------------------------------------------

export async function setArtworkStatusAction(
  id: string,
  status: "DRAFT" | "ARCHIVED"
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const artwork = await db.artwork.findUnique({ where: { id } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید." };
  }
  assertTransition(LISTING_MACHINE, "listing", artwork.status, status);
  await db.artwork.update({ where: { id }, data: { status } });
  await db.auditLog.create({
    data: { actor: user.email, action: "ARTWORK_STATUS", target: artwork.code, detail: status },
  });
  invalidatePublicCatalog();
  revalidatePath("/dashboard/artworks");
  return { ok: true, message: "وضعیت اثر تغییر یافت." };
}

/** Seller resubmits a REJECTED listing after editing (fee policy applies again). */
export async function resubmitRejectedArtworkAction(artworkId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const artwork = await db.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید." };
  }
  assertTransition(LISTING_MACHINE, "listing", artwork.status, "PENDING_REVIEW");
  await db.artwork.update({ where: { id: artworkId }, data: { status: "PENDING_REVIEW", reviewNote: null } });
  await db.auditLog.create({
    data: { actor: user.email, action: "ARTWORK_RESUBMIT", target: artwork.code, detail: "ارسال دوباره پس از رد" },
  });
  invalidatePublicCatalog();
  revalidatePath("/dashboard/artworks");
  return { ok: true, message: "اثر ویرایش‌شده برای بازبینی دوباره ارسال شد." };
}

/** Soft-delete a DRAFT (audited data is never hard-deleted). */
export async function deleteDraftAction(artworkId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const artwork = await db.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  if (artwork.sellerId !== user.id && user.role !== "ADMIN") {
    return { ok: false, error: "شما مالک این اثر نیستید." };
  }
  if (artwork.status !== "DRAFT" && artwork.status !== "REJECTED") {
    return { ok: false, error: "فقط پیش‌نویس‌ها و آثار ردشده قابل حذف هستند." };
  }
  await db.artwork.update({ where: { id: artworkId }, data: { deletedAt: new Date(), status: "ARCHIVED" } });
  await db.auditLog.create({ data: { actor: user.email, action: "ARTWORK_SOFT_DELETE", target: artwork.code } });
  invalidatePublicCatalog();
  revalidatePath("/dashboard/artworks");
  return { ok: true, message: "اثر حذف شد (بایگانی نرم؛ سوابق حفظ می‌شود)." };
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
  revalidatePath("/dashboard/lab");
  return { ok: true, message: "درخواست شما در آزمایشگاه اصالت ثبت شد (رکورد دیجیتال — بدون آزمایش فیزیکی)." };
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

export async function requestPayoutAction(
  input: z.input<typeof settleSchema>
): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "تسویه فقط برای استادکاران فعال است." };
  }
  if (!(await rateLimit(`payout|${actionIp()}`, 5, 60_000))) {
    return { ok: false, error: "تعداد درخواست‌ها بیش از حد مجاز است." };
  }
  const parsed = settleSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  }

  // Withdrawable balance: CLEARED credits only (escrow-aware), minus locked payouts.
  const cleared = await db.ledgerEntry.aggregate({
    where: { sellerId: user.id, status: "CLEARED" },
    _sum: { amount: true },
  });
  const locked = await db.payoutRequest.aggregate({
    where: { sellerId: user.id, status: { in: ["PENDING", "APPROVED"] } },
    _sum: { amount: true },
  });
  const available = (cleared._sum.amount ?? 0) - (locked._sum.amount ?? 0);
  if (parsed.data.amount > available) {
    return {
      ok: false,
      error: `مبلغ درخواستی از موجودی قابل تسویه (${Math.max(0, available).toLocaleString("fa-IR")} تومان) بیشتر است. مبالغ «در انتظار تحویل» و «در دوره نگهداری» هنوز قابل برداشت نیستند.`,
    };
  }

  const retentionActive = await db.ledgerEntry.count({
    where: { sellerId: user.id, status: "HOLDING" },
  });
  await db.payoutRequest.create({
    data: { sellerId: user.id, amount: parsed.data.amount, iban: parsed.data.iban, status: "PENDING" },
  });
  await db.auditLog.create({
    data: {
      actor: user.email,
      action: "PAYOUT_REQUEST",
      target: user.shopTitle || user.name,
      detail: `${parsed.data.amount.toLocaleString("fa-IR")} تومان${retentionActive ? ` — ${retentionActive} قلم در دوره نگهداری` : ""}`,
    },
  });
  revalidatePath("/dashboard/finance");
  return { ok: true, message: "درخواست تسویه (نمایشی) ثبت شد و پس از بررسی مدیریت پرداخت می‌شود." };
}

// Keep the old export name as an alias so older call sites keep compiling.
export const requestSettlementAction = requestPayoutAction;
