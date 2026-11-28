"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db, dbTx } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { invalidatePublicCatalog } from "@/lib/data";
import type { ActionResult } from "@/lib/actions/auth";
import { assertTransition, LISTING_MACHINE, MEMBER_REQUEST_MACHINE, PAYOUT_MACHINE, AUTHENTICITY_MACHINE } from "@/lib/state-machines";
import { notify } from "@/lib/notify";
import { getAllSettings, setSetting } from "@/lib/settings";

/**
 * Admin actions — every privileged operation re-checks the ADMIN role
 * on the server. Client-side role values are never trusted (M3).
 */

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return null;
  if (user.role !== "ADMIN") return null;
  return user;
}

async function audit(actor: string, action: string, target: string, detail?: string) {
  await db.auditLog.create({ data: { actor, action, target, detail } });
}

// ---------------------------------------------------------------------------
// Memberships (M3)
// ---------------------------------------------------------------------------

export async function decideMemberRequestAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const request = await db.memberRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { email: true, id: true } } },
  });
  if (!request) return { ok: false, error: "درخواست یافت نشد." };
  assertTransition(MEMBER_REQUEST_MACHINE, "member-request", request.status, decision);

  await dbTx(async (tx) => {
    await tx.memberRequest.update({
      where: { id: requestId },
      data: { status: decision, decidedAt: new Date() },
    });
    if (decision === "APPROVED") {
      await tx.user.update({
        where: { id: request.userId },
        data: { verified: true }, // plan assignment happens via Subscription (S5), not on the user
      });
      await notify({
        userId: request.userId,
        type: "ADMIN",
        title: "عضویت استادکار شما تایید شد",
        body: "از این پس می‌توانید آثار خود را برای بازبینی ارسال کنید. پلن فعلی شما «رایگان» است؛ برای سقف بیشتر به صفحه پلن‌ها بروید.",
        link: "/dashboard/plans",
      });
    } else {
      await notify({
        userId: request.userId,
        type: "ADMIN",
        title: "درخواست عضویت شما رد شد",
        body: "درخواست عضویت شما رد شد. می‌توانید با پشتیبانی تماس بگیرید.",
        link: "/contact",
      });
    }
    await tx.auditLog.create({
      data: { actor: admin.email, action: `MEMBER_${decision}`, target: request.workshop, detail: request.user.email },
    });
  });

  revalidatePath("/admin");
  return { ok: true, message: decision === "APPROVED" ? "عضویت استادکار تایید شد." : "درخواست عضویت رد شد." };
}

// ---------------------------------------------------------------------------
// Artwork review (M4) — machine-guarded; REJECTED refund via Setting
// ---------------------------------------------------------------------------

export async function decideArtworkVerificationAction(
  artworkId: string,
  decision: "PUBLISHED" | "REJECTED",
  note?: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const artwork = await db.artwork.findUnique({ where: { id: artworkId }, include: { authenticity: true } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };
  assertTransition(LISTING_MACHINE, "listing", artwork.status, decision);

  const listingActiveDays = (await import("@/lib/settings")).getNumberSetting;

  await dbTx(async (tx) => {
    if (decision === "PUBLISHED") {
      const activeDays = await listingActiveDays("LISTING_ACTIVE_DAYS");
      const now = new Date();
      await tx.artwork.update({
        where: { id: artworkId },
        data: {
          status: "PUBLISHED",
          reviewNote: null,
          publishedAt: now,
          expiresAt: new Date(now.getTime() + activeDays * 24 * 3600 * 1000),
        },
      });
    } else {
      await tx.artwork.update({
        where: { id: artworkId },
        data: { status: "REJECTED", reviewNote: note || "نیازمند اصلاح و ارسال دوباره." },
      });
    }

    const record = artwork.authenticity;
    if (record) {
      assertTransition(AUTHENTICITY_MACHINE, "authenticity", record.status, decision === "PUBLISHED" ? "VERIFIED" : "REJECTED");
      await tx.authenticityRecord.update({
        where: { id: record.id },
        data: {
          status: decision === "PUBLISHED" ? "VERIFIED" : "REJECTED",
          labStatus: decision === "PUBLISHED" ? "ISSUED" : "QUEUED",
          inspector: admin.name,
          issuedAt: decision === "PUBLISHED" ? new Date() : null,
          notes: note || record.notes,
        },
      });
      await tx.verificationEvent.create({
        data: {
          recordId: record.id,
          actor: admin.email,
          action: decision === "PUBLISHED" ? "ISSUED" : "REJECTED",
          detail: note || (decision === "PUBLISHED" ? "شناسنامه اصالت صادر شد." : "عدم تایید اثر توسط مدیریت."),
        },
      });
    }

    // Refund the listing fee as credit when the listing is REJECTED (Setting).
    if (decision === "REJECTED") {
      const { getBoolSetting } = await import("@/lib/settings");
      const refund = await getBoolSetting("LISTING_FEE_REFUND_ON_REJECT");
      if (refund) {
        const paidInvoice = await tx.invoice.findFirst({
          where: { listingId: artworkId, kind: "LISTING_FEE", status: "PAID" },
          orderBy: { createdAt: "desc" },
        });
        if (paidInvoice) {
          await tx.ledgerEntry.create({
            data: {
              sellerId: artwork.sellerId,
              kind: "LISTING_FEE_REFUND",
              amount: paidInvoice.amount, // credit (اعتبار) for the next listing fee
              status: "CLEARED",
              detail: `اعتبار بازگشت کارمزد ثبت آگهی «${artwork.title}» (${paidInvoice.number})`,
            },
          });
          await tx.invoice.update({
            where: { id: paidInvoice.id },
            data: { status: "REFUNDED" },
          });
          await notify({
            userId: artwork.sellerId,
            type: "ARTWORK",
            title: "اثر شما رد شد؛ کارمزد به اعتبار برگشت",
            body: `اثر «${artwork.title}» رد شد. دلیل: ${note ?? "—"}. کارمزد ثبت به‌صورت اعتبار به حساب شما برگشت داده شد.`,
            link: "/dashboard/artworks",
          });
        } else {
          await notify({
            userId: artwork.sellerId,
            type: "ARTWORK",
            title: "اثر شما رد شد",
            body: `اثر «${artwork.title}» رد شد. دلیل: ${note ?? "—"}. می‌توانید ویرایش و دوباره ارسال کنید.`,
            link: "/dashboard/artworks",
          });
        }
      }
    }
    if (decision === "PUBLISHED") {
      await notify({
        userId: artwork.sellerId,
        type: "ARTWORK",
        title: "اثر شما منتشر شد",
        body: `اثر «${artwork.title}» تایید و منتشر شد؛ شناسنامه دیجیتال اصالت آن صادر گردید.`,
        link: `/products/${artwork.slug}`,
      });
    }
    await tx.auditLog.create({
      data: { actor: admin.email, action: decision === "PUBLISHED" ? "VERIFY_ARTWORK" : "REJECT_ARTWORK", target: artwork.code, detail: note },
    });
  }, { timeout: 30_000 });

  invalidatePublicCatalog();
  revalidatePath("/admin");
  revalidatePath("/dashboard/artworks");
  return {
    ok: true,
    message: decision === "PUBLISHED" ? "اثر منتشر و شناسنامه اصالت آن صادر شد." : "اثر رد شد (در صورت پرداخت کارمزد، اعتبار بازگشت داده شد).",
  };
}

export async function updateLabStatusAction(
  recordId: string,
  labStatus: "QUEUED" | "IN_LAB" | "TESTS_DONE" | "ISSUED"
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const record = await db.authenticityRecord.findUnique({ where: { id: recordId } });
  if (!record) return { ok: false, error: "پرونده اصالت یافت نشد." };

  await db.authenticityRecord.update({
    where: { id: recordId },
    data: {
      labStatus,
      status: labStatus === "ISSUED" ? "VERIFIED" : record.status,
      issuedAt: labStatus === "ISSUED" ? new Date() : record.issuedAt,
      inspector: admin.name,
    },
  });
  await db.verificationEvent.create({
    data: {
      recordId,
      actor: admin.email,
      action: labStatus,
      detail: `وضعیت صف اصالت به ${labStatus} تغییر یافت.`,
    },
  });
  await audit(admin.email, "LAB_STATUS", record.hologramCode, labStatus);
  invalidatePublicCatalog();
  revalidatePath("/admin");
  return { ok: true, message: "وضعیت پرونده اصالت به‌روزرسانی شد." };
}

// ---------------------------------------------------------------------------
// Payouts (S6) — strict state machine + ATOMIC PAID with balance re-check
// ---------------------------------------------------------------------------

export async function decidePayoutAction(
  payoutId: string,
  decision: "APPROVED" | "PAID" | "REJECTED",
  adminNote?: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const payout = await db.payoutRequest.findUnique({ where: { id: payoutId } });
  if (!payout) return { ok: false, error: "درخواست تسویه یافت نشد." };
  assertTransition(PAYOUT_MACHINE, "payout", payout.status, decision);

  if (decision === "PAID") {
    // ATOMIC PAID: re-check the withdrawable balance INSIDE the transaction and
    // claim the PENDING/APPROVED row — a double-PAID is impossible (known-issue fix).
    await dbTx(async (tx) => {
      const claimed = await tx.payoutRequest.updateMany({
        where: { id: payout.id, status: "APPROVED" },
        data: { status: "PAID", adminNote: adminNote || payout.adminNote, decidedAt: new Date(), paidAt: new Date(), reference: `DEMO-PAYOUT-${Date.now().toString(36).toUpperCase()}` },
      });
      if (claimed.count === 0) {
        throw new Error("DOUBLE_PAID_OR_NOT_APPROVED");
      }
      const cleared = await tx.ledgerEntry.aggregate({
        where: { sellerId: payout.sellerId, status: "CLEARED" },
        _sum: { amount: true },
      });
      const locked = await tx.payoutRequest.aggregate({
        where: { sellerId: payout.sellerId, status: { in: ["PENDING", "APPROVED"] } },
        _sum: { amount: true },
      });
      const available = (cleared._sum.amount ?? 0) - (locked._sum.amount ?? 0);
      if (available < 0) {
        throw new Error("INSUFFICIENT_BALANCE");
      }
      await tx.ledgerEntry.create({
        data: {
          sellerId: payout.sellerId,
          kind: "PAYOUT",
          amount: -payout.amount,
          detail: `واریز شبا ${payout.iban} — تسویه تاییدشده (نمایشی)`,
          status: "CLEARED",
        },
      });
      await tx.auditLog.create({
        data: { actor: admin.email, action: "PAYOUT_PAID", target: payout.iban, detail: `${payout.amount.toLocaleString("fa-IR")} تومان (نمایشی)` },
      });
      await notify({
        userId: payout.sellerId,
        type: "PAYOUT",
        title: "تسویه واریز شد (نمایشی)",
        body: `مبلغ ${payout.amount.toLocaleString("fa-IR")} تومان به شبا ${payout.iban} واریز شد (شبیه‌سازی).`,
        link: "/dashboard/finance",
      });
    }, { timeout: 30_000 }).catch((err: Error) => {
      if (err.message === "DOUBLE_PAID_OR_NOT_APPROVED") {
        throw new Error("این تسویه قبلاً نهایی شده یا در وضعیت مجاز نیست.");
      }
      if (err.message === "INSUFFICIENT_BALANCE") {
        throw new Error("مانده قابل تسویه فروشنده برای این واریز کافی نیست؛ درخواست را رد کنید.");
      }
      throw err;
    });
    revalidatePath("/admin");
    revalidatePath("/dashboard/finance");
    return { ok: true, message: "واریز تسویه ثبت شد (نمایشی — بدون انتقال پول واقعی)." };
  }

  // APPROVED / REJECTED — machine-guarded update.
  await dbTx(async (tx) => {
    await tx.payoutRequest.update({
      where: { id: payout.id },
      data: { status: decision, adminNote: adminNote || null, decidedAt: new Date() },
    });
    await tx.auditLog.create({
      data: { actor: admin.email, action: `PAYOUT_${decision}`, target: payout.iban, detail: `${payout.amount.toLocaleString("fa-IR")} تومان` },
    });
    await notify({
      userId: payout.sellerId,
      type: "PAYOUT",
      title: decision === "APPROVED" ? "درخواست تسویه تایید شد" : "درخواست تسویه رد شد",
      body: decision === "APPROVED"
        ? `درخواست ${payout.amount.toLocaleString("fa-IR")} تومانی شما تایید شد و در صف واریز قرار گرفت.`
        : `درخواست تسویه شما رد شد. ${adminNote ?? ""}`,
      link: "/dashboard/finance",
    });
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard/finance");
  return { ok: true, message: decision === "APPROVED" ? "درخواست تسویه تایید شد." : "درخواست تسویه رد شد." };
}

// ---------------------------------------------------------------------------
// Plans CRUD (S5) + manual subscription assignment
// ---------------------------------------------------------------------------

const planSchema = z.object({
  id: z.string().min(2).max(30).regex(/^[a-z0-9-]+$/, "شناسه پلن فقط حروف کوچک و خط تیره"),
  slug: z.string().min(2).max(40),
  title: z.string().min(2).max(80),
  tag: z.string().max(80).optional().or(z.literal("")),
  priceToman: z.coerce.number().int().min(0).max(10_000_000_000),
  periodDays: z.coerce.number().int().min(0).max(3650),
  maxActiveListings: z.coerce.number().int().min(1).max(10000).nullable().optional(),
  listingFeeToman: z.coerce.number().int().min(0).max(100_000_000),
  commissionBps: z.coerce.number().int().min(0).max(10000),
  features: z.array(z.string().max(200)).max(12).default([]),
  highlight: z.boolean().default(false),
  active: z.boolean().default(true),
  sortOrder: z.coerce.number().int().min(0).max(100).default(0),
});

export async function upsertPlanAction(input: z.input<typeof planSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const parsed = planSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  const d = parsed.data;
  await db.plan.upsert({
    where: { id: d.id },
    create: {
      id: d.id,
      slug: d.slug,
      title: d.title,
      tag: d.tag || null,
      priceToman: d.priceToman,
      periodDays: d.periodDays,
      maxActiveListings: d.maxActiveListings ?? null,
      listingFeeToman: d.listingFeeToman,
      commissionBps: d.commissionBps,
      features: JSON.stringify(d.features),
      highlight: d.highlight,
      active: d.active,
      sortOrder: d.sortOrder,
    },
    update: {
      title: d.title,
      tag: d.tag || null,
      priceToman: d.priceToman,
      periodDays: d.periodDays,
      maxActiveListings: d.maxActiveListings ?? null,
      listingFeeToman: d.listingFeeToman,
      commissionBps: d.commissionBps,
      features: JSON.stringify(d.features),
      highlight: d.highlight,
      active: d.active,
      sortOrder: d.sortOrder,
    },
  });
  await audit(admin.email, "PLAN_UPSERT", d.id, `${d.title} — سقف ${d.maxActiveListings ?? "نامحدود"}`);
  revalidatePath("/admin");
  revalidatePath("/plans");
  return { ok: true, message: "پلن ذخیره شد." };
}

const assignSubSchema = z.object({
  sellerEmail: z.string().email("رایانامه استادکار معتبر نیست"),
  planId: z.string().min(2),
  months: z.coerce.number().int().min(1).max(36).default(12),
});

/** Manual subscription assignment (S5) — admin-granted, labeled manual. */
export async function assignSubscriptionAction(input: z.input<typeof assignSubSchema>): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const parsed = assignSubSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };

  const seller = await db.user.findUnique({ where: { email: parsed.data.sellerEmail.toLowerCase() } });
  if (!seller || seller.role !== "ARTISAN") {
    return { ok: false, error: "استادکاری با این رایانامه یافت نشد." };
  }
  const plan = await db.plan.findUnique({ where: { id: parsed.data.planId } });
  if (!plan || !plan.active) return { ok: false, error: "پلن یافت نشد یا غیرفعال است." };

  const now = new Date();
  const expiresAt = new Date(now.getTime() + parsed.data.months * 30 * 24 * 3600 * 1000);
  await dbTx(async (tx) => {
    await tx.subscription.updateMany({
      where: { sellerId: seller.id, status: "ACTIVE" },
      data: { status: "CANCELED" },
    });
    await tx.subscription.create({
      data: { sellerId: seller.id, planId: plan.id, status: "ACTIVE", startsAt: now, expiresAt },
    });
    await tx.auditLog.create({
      data: { actor: admin.email, action: "SUBSCRIPTION_ASSIGN", target: seller.email, detail: `${plan.title} تا ${expiresAt.toLocaleDateString("fa-IR")} (تخصیص دستی)` },
    });
    await notify({
      userId: seller.id,
      type: "PLAN",
      title: "اشتراک شما توسط مدیریت فعال شد",
      body: `پلن ${plan.title} تا ${expiresAt.toLocaleDateString("fa-IR")} فعال شد (تخصیص دستی مدیریت).`,
      link: "/dashboard/plans",
    });
  });
  revalidatePath("/admin");
  return { ok: true, message: "اشتراک دستی فعال شد." };
}

// ---------------------------------------------------------------------------
// Users & support
// ---------------------------------------------------------------------------

export async function toggleUserSuspensionAction(userId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  if (admin.id === userId) return { ok: false, error: "نمی‌توانید حساب خود را تعلیق کنید." };
  const target = await db.user.findUnique({ where: { id: userId } });
  if (!target) return { ok: false, error: "کاربر یافت نشد." };
  if (target.role === "ADMIN") return { ok: false, error: "تعلیق حساب ادمین مجاز نیست." };
  await db.user.update({ where: { id: userId }, data: { suspended: !target.suspended } });
  if (!target.suspended) {
    await db.session.deleteMany({ where: { userId } }); // log out suspended users
  }
  await audit(admin.email, target.suspended ? "USER_UNSUSPEND" : "USER_SUSPEND", target.email);
  revalidatePath("/admin");
  return { ok: true, message: target.suspended ? "دسترسی کاربر بازگردانده شد." : "دسترسی کاربر تعلیق شد." };
}

export async function markMessageHandledAction(messageId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  await db.contactMessage.update({ where: { id: messageId }, data: { handled: true } });
  revalidatePath("/admin");
  return { ok: true, message: "پیام به‌عنوان بررسی‌شده علامت خورد." };
}

// ---------------------------------------------------------------------------
// Platform settings (tunables) — labelled admin-only
// ---------------------------------------------------------------------------

export async function updateSettingAction(key: string, value: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  const all = await getAllSettings();
  if (!(key in all)) return { ok: false, error: "کلید تنظیمات شناخته‌شده نیست." };
  const n = Number(value);
  if (Number.isNaN(n) || n < 0) return { ok: false, error: "مقدار باید عددی و نامنفی باشد." };
  await setSetting(key, String(Math.floor(n)), "admin-edit", `ویرایش‌شده توسط ${admin.email}`);
  await audit(admin.email, "SETTING_UPDATE", key, `${key} = ${n}`);
  revalidatePath("/admin");
  return { ok: true, message: "تنظیمات ذخیره شد." };
}

/** Legacy alias kept for old call sites. */
export const decideSettlementAction = decidePayoutAction;
