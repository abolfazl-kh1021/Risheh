"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { invalidatePublicCatalog } from "@/lib/data";
import type { ActionResult } from "@/lib/actions/auth";

/**
 * Admin actions — every privileged operation re-checks the ADMIN role
 * on the server. Client-side role values are never trusted.
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

export async function decideMemberRequestAction(
  requestId: string,
  decision: "APPROVED" | "REJECTED"
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const request = await db.memberRequest.findUnique({
    where: { id: requestId },
    include: { user: { select: { email: true } } },
  });
  if (!request) return { ok: false, error: "درخواست یافت نشد." };
  if (request.status !== "PENDING") return { ok: false, error: "این درخواست قبلاً بررسی شده است." };

  await db.memberRequest.update({
    where: { id: requestId },
    data: { status: decision, decidedAt: new Date() },
  });
  if (decision === "APPROVED") {
    await db.user.update({
      where: { id: request.userId },
      data: { verified: true, planId: request.planId },
    });
  }
  await audit(admin.email, `MEMBER_${decision}`, request.workshop, request.user.email);
  revalidatePath("/");
  return { ok: true, message: decision === "APPROVED" ? "عضویت استادکار تایید شد." : "درخواست عضویت رد شد." };
}

export async function decideArtworkVerificationAction(
  artworkId: string,
  decision: "PUBLISHED" | "REJECTED",
  note?: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const artwork = await db.artwork.findUnique({ where: { id: artworkId } });
  if (!artwork) return { ok: false, error: "اثر یافت نشد." };

  await db.artwork.update({ where: { id: artworkId }, data: { status: decision } });
  const record = await db.authenticityRecord.findUnique({ where: { artworkId } });
  if (record) {
    await db.authenticityRecord.update({
      where: { id: record.id },
      data: {
        status: decision === "PUBLISHED" ? "VERIFIED" : "REJECTED",
        labStatus: decision === "PUBLISHED" ? "ISSUED" : "QUEUED",
        inspector: admin.name,
        issuedAt: decision === "PUBLISHED" ? new Date() : null,
        notes: note || record.notes,
      },
    });
    await db.verificationEvent.create({
      data: {
        recordId: record.id,
        actor: admin.email,
        action: decision === "PUBLISHED" ? "ISSUED" : "REJECTED",
        detail: note || (decision === "PUBLISHED" ? "شناسنامه اصالت صادر شد." : "عدم تایید اثر توسط مدیریت."),
      },
    });
  }
  await audit(admin.email, decision === "PUBLISHED" ? "VERIFY_ARTWORK" : "REJECT_ARTWORK", artwork.code, note);
  invalidatePublicCatalog();
  revalidatePath("/");
  return {
    ok: true,
    message: decision === "PUBLISHED" ? "اثر منتشر و شناسنامه اصالت آن صادر شد." : "اثر رد شد.",
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
      detail: `وضعیت آزمایشگاه به ${labStatus} تغییر یافت.`,
    },
  });
  await audit(admin.email, "LAB_STATUS", record.hologramCode, labStatus);
  invalidatePublicCatalog(); // authenticity.labStatus is part of the artwork DTO
  revalidatePath("/");
  return { ok: true, message: "وضعیت پرونده آزمایشگاه به‌روزرسانی شد." };
}

export async function decideSettlementAction(
  settlementId: string,
  decision: "APPROVED" | "PAID" | "REJECTED",
  adminNote?: string
): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };

  const settlement = await db.settlementRequest.findUnique({ where: { id: settlementId } });
  if (!settlement) return { ok: false, error: "درخواست تسویه یافت نشد." };
  if (settlement.status === "PAID") return { ok: false, error: "این تسویه قبلاً پرداخت شده است." };

  await db.settlementRequest.update({
    where: { id: settlementId },
    data: { status: decision, adminNote: adminNote || null, decidedAt: new Date() },
  });
  if (decision === "PAID") {
    await db.ledgerEntry.create({
      data: {
        sellerId: settlement.sellerId,
        kind: "PAYOUT",
        amount: -settlement.amount,
        detail: `واریز شبا ${settlement.iban} — تسویه تاییدشده`,
        status: "CLEARED",
      },
    });
  }
  await audit(admin.email, `SETTLE_${decision}`, settlement.iban, `${settlement.amount} تومان`);
  revalidatePath("/");
  return {
    ok: true,
    message:
      decision === "PAID"
        ? "تسویه به‌عنوان واریز شده ثبت شد (نمایشی — بدون انتقال پول واقعی)."
        : decision === "APPROVED"
          ? "درخواست تسویه تایید شد."
          : "درخواست تسویه رد شد.",
  };
}

export async function markMessageHandledAction(messageId: string): Promise<ActionResult> {
  const admin = await requireAdmin();
  if (!admin) return { ok: false, error: "این عملیات نیازمند دسترسی مدیریت است." };
  await db.contactMessage.update({ where: { id: messageId }, data: { handled: true } });
  revalidatePath("/");
  return { ok: true, message: "پیام به‌عنوان بررسی‌شده علامت خورد." };
}
