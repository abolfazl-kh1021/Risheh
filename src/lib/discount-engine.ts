import { z } from "zod";
import { db } from "@/lib/db";
import { toEnDigits } from "@/lib/fa";
import type { DiscountCode } from "@prisma/client";
import { DISCOUNT_STATUS_FA, discountValueFa } from "@/lib/fa";

/**
 * Shared server-side discount engine.
 *
 * Used by both the storefront claim flow (discounts.ts) and the checkout
 * (orders.ts). Lives outside "use server" files because helpers are shared;
 * every caller still validates the session server-side before using it.
 *
 * The checkout path ALWAYS recomputes the discount from the database here —
 * client-supplied amounts are never trusted.
 */

export function normalizeDiscountCode(raw: string): string {
  return toEnDigits(raw).trim().toUpperCase().replace(/\s+/g, "-");
}

export type DiscountStatus =
  | "VALID"
  | "NOT_FOUND"
  | "INACTIVE"
  | "NOT_STARTED"
  | "EXPIRED"
  | "EXHAUSTED"
  | "AUDIENCE_MISMATCH"
  | "USER_LIMIT"
  | "MIN_PRICE_NOT_MET";

export type CheckoutDiscount =
  | { ok: true; code: DiscountCode; discount: number; message: string }
  | { ok: false; status: DiscountStatus; message: string };

/**
 * Evaluate a code against a cart subtotal for checkout application.
 * Applies: active window, usage caps, audience scope, per-user limit,
 * minPrice threshold and maxPrice cap. Returns the server-computed discount.
 */
export async function evaluateDiscountForCheckout(
  rawCode: string,
  user: { id: string; role: string } | null,
  subtotal: number
): Promise<CheckoutDiscount> {
  const normalized = normalizeDiscountCode(rawCode);
  if (!normalized) {
    return { ok: false, status: "NOT_FOUND", message: DISCOUNT_STATUS_FA.NOT_FOUND };
  }

  const code = await db.discountCode.findUnique({
    where: { code: normalized },
    include: { campaign: true },
  });
  const invalid = (status: DiscountStatus): CheckoutDiscount => ({
    ok: false,
    status,
    message: DISCOUNT_STATUS_FA[status],
  });

  if (!code) return invalid("NOT_FOUND");
  const now = new Date();
  if (!code.active) return invalid("INACTIVE");
  if (code.startsAt && code.startsAt.getTime() > now.getTime()) return invalid("NOT_STARTED");
  if (code.expiresAt && code.expiresAt.getTime() < now.getTime()) return invalid("EXPIRED");
  if (code.usedCount >= code.maxUses) return invalid("EXHAUSTED");
  if (user && code.audience !== "ALL" && code.audience !== user.role) return invalid("AUDIENCE_MISMATCH");
  if (!user) {
    // Discount codes are account-bound; guests must sign in first.
    return { ok: false, status: "AUDIENCE_MISMATCH", message: DISCOUNT_STATUS_FA.AUDIENCE_MISMATCH };
  }
  if (code.minPrice && subtotal < code.minPrice) return invalid("MIN_PRICE_NOT_MET");

  const myUses = await db.discountRedemption.count({ where: { codeId: code.id, userId: user.id } });
  if (myUses >= code.perUserLimit) return invalid("USER_LIMIT");

  let discount =
    code.kind === "PERCENT" ? Math.floor((subtotal * code.amount) / 100) : code.amount;
  if (code.kind === "PERCENT" && code.maxPrice) discount = Math.min(discount, code.maxPrice);
  discount = Math.max(0, Math.min(discount, subtotal));

  return {
    ok: true,
    code,
    discount,
    message: `کد معتبر است — ${discountValueFa(code.kind, code.amount)} (${discount.toLocaleString("fa-IR")} تومان تخفیف)`,
  };
}
