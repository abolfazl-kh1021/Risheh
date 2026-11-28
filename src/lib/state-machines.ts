/**
 * Central state machines (Phase 1) — every status transition in the platform
 * must go through `assertTransition`. Unauthorized/illogical transitions throw
 * `TransitionError`, which actions surface as Persian error messages.
 *
 * Machines covered (scope §۴.۲/§۴.۵, M6/M7):
 *  - Listing: DRAFT → PENDING_REVIEW → PUBLISHED → (EXPIRED|ARCHIVED|SOLD), REJECTED
 *  - Order (parent): PENDING_PAYMENT → PAID → PREPARING → SHIPPED → DELIVERED, CANCELLED, PAYMENT_FAILED, EXPIRED
 *  - SellerOrder: PAID → PREPARING → SHIPPED → DELIVERED, CANCELLED
 *  - PaymentAttempt: PENDING → SUCCESS|FAILED|CANCELED
 *  - Invoice: PENDING → PAID|FAILED|CANCELED|REFUNDED
 *  - Subscription: PENDING|ACTIVE → EXPIRED|CANCELED, PENDING → ACTIVE
 *  - PayoutRequest: PENDING → APPROVED|REJECTED; APPROVED → PAID|REJECTED
 *  - ReturnRequest: PENDING → APPROVED|REJECTED; APPROVED → RECEIVED|REJECTED; RECEIVED → REFUNDED
 *  - MemberRequest: PENDING → APPROVED|REJECTED
 *  - AuthenticityRecord: PENDING → VERIFIED|REJECTED; VERIFIED → PENDING (material edit)
 *  - LabRequest: NEW → SCHEDULED → DONE|REJECTED (SCHEDULED → NEW allowed for reschedule)
 *  - StockReservation: ACTIVE → CONVERTED|RELEASED|EXPIRED
 */

export class TransitionError extends Error {
  constructor(
    public entity: string,
    public from: string,
    public to: string
  ) {
    super(`Invalid transition ${entity}: ${from} → ${to}`);
    this.name = "TransitionError";
  }
}

export type Machine = Record<string, readonly string[]>;

export function assertTransition(
  machine: Machine,
  entity: string,
  from: string,
  to: string
): void {
  const allowed = machine[from];
  if (!allowed || !allowed.includes(to)) {
    throw new TransitionError(entity, from, to);
  }
}

export function canTransition(machine: Machine, from: string, to: string): boolean {
  return (machine[from] ?? []).includes(to);
}

// ---------------------------------------------------------------------------
// Listing (آگهی) — lifecycle per scope §۴.۲
// ---------------------------------------------------------------------------

export const LISTING_MACHINE: Machine = {
  DRAFT: ["PENDING_REVIEW", "ARCHIVED"],
  PENDING_REVIEW: ["PUBLISHED", "REJECTED", "DRAFT", "ARCHIVED"], // PUBLISHED only after admin approval
  PUBLISHED: ["ARCHIVED", "EXPIRED", "SOLD"],
  REJECTED: ["PENDING_REVIEW", "ARCHIVED"], // seller edits & resubmits (fee refund policy separate)
  EXPIRED: ["PENDING_REVIEW", "ARCHIVED"], // renew = new review cycle with fee
  ARCHIVED: ["DRAFT"],
  SOLD: [],
};

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export const ORDER_MACHINE: Machine = {
  PENDING_PAYMENT: ["PAID", "PAYMENT_FAILED", "CANCELLED", "EXPIRED"],
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED", "CANCELLED"], // return flow goes through ReturnRequest
  DELIVERED: [],
  CANCELLED: [],
  PAYMENT_FAILED: ["PENDING_PAYMENT"], // buyer retries payment
  EXPIRED: [],
};

export const SELLER_ORDER_MACHINE: Machine = {
  PAID: ["PREPARING", "CANCELLED"],
  PREPARING: ["SHIPPED", "CANCELLED"],
  SHIPPED: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

// ---------------------------------------------------------------------------
// Payments & invoices
// ---------------------------------------------------------------------------

export const PAYMENT_MACHINE: Machine = {
  PENDING: ["SUCCESS", "FAILED", "CANCELED"],
  SUCCESS: [],
  FAILED: [],
  CANCELED: [],
};

export const INVOICE_MACHINE: Machine = {
  PENDING: ["PAID", "FAILED", "CANCELED"],
  PAID: ["REFUNDED"],
  FAILED: ["PENDING"], // retry
  CANCELED: [],
  REFUNDED: [],
};

// ---------------------------------------------------------------------------
// Subscriptions, payouts, returns, membership, lab, reservations
// ---------------------------------------------------------------------------

export const SUBSCRIPTION_MACHINE: Machine = {
  PENDING: ["ACTIVE", "CANCELED", "EXPIRED"],
  ACTIVE: ["EXPIRED", "CANCELED"],
  EXPIRED: [],
  CANCELED: [],
};

export const PAYOUT_MACHINE: Machine = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["PAID", "REJECTED"],
  PAID: [],
  REJECTED: [],
};

export const RETURN_MACHINE: Machine = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: ["RECEIVED", "REJECTED"],
  RECEIVED: ["REFUNDED", "REJECTED"],
  REFUNDED: [],
  REJECTED: [],
};

export const MEMBER_REQUEST_MACHINE: Machine = {
  PENDING: ["APPROVED", "REJECTED"],
  APPROVED: [],
  REJECTED: [],
};

export const AUTHENTICITY_MACHINE: Machine = {
  PENDING: ["VERIFIED", "REJECTED"],
  VERIFIED: ["PENDING"], // material edit re-opens review (scope §۴.۲)
  REJECTED: ["PENDING"],
};

export const LAB_REQUEST_MACHINE: Machine = {
  NEW: ["SCHEDULED", "REJECTED", "DONE"],
  SCHEDULED: ["DONE", "REJECTED", "NEW"],
  DONE: [],
  REJECTED: [],
};

export const STOCK_RESERVATION_MACHINE: Machine = {
  ACTIVE: ["CONVERTED", "RELEASED", "EXPIRED"],
  CONVERTED: [],
  RELEASED: [],
  EXPIRED: [],
};

// ---------------------------------------------------------------------------
// Derived parent order status from seller sub-orders (§۴.۴)
// ---------------------------------------------------------------------------

/** Derive the parent order status from its seller sub-orders. */
export function deriveOrderStatus(
  sellerStatuses: readonly string[],
  fallback: string = "PAID"
): string {
  if (sellerStatuses.length === 0) return fallback;
  if (sellerStatuses.every((s) => s === "DELIVERED")) return "DELIVERED";
  if (sellerStatuses.every((s) => s === "CANCELLED")) return "CANCELLED";
  if (sellerStatuses.every((s) => s === "DELIVERED" || s === "CANCELLED")) return "DELIVERED";
  if (sellerStatuses.some((s) => s === "SHIPPED")) return "SHIPPED";
  if (sellerStatuses.some((s) => s === "PREPARING")) return "PREPARING";
  return fallback; // all PAID
}

// Persian labels for every machine state (single source of truth for UI)
export const LISTING_STATUS_FA: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PENDING_REVIEW: "در انتظار بازبینی",
  PUBLISHED: "منتشر شده",
  REJECTED: "رد شده",
  EXPIRED: "منقضی شده",
  ARCHIVED: "بایگانی",
  SOLD: "فروخته شده",
};

export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت شده",
  PREPARING: "در حال آماده‌سازی",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
  PAYMENT_FAILED: "پرداخت ناموفق",
  EXPIRED: "منقضی شده",
};

export const PAYMENT_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار نتیجه",
  SUCCESS: "موفق",
  FAILED: "ناموفق",
  CANCELED: "لغو شده",
};

export const PAYOUT_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده — در صف واریز",
  PAID: "واریز شده (نمایشی)",
  REJECTED: "رد شده",
};

export const RETURN_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده — منتظر ارسال مرسول",
  RECEIVED: "مرسول دریافت شد",
  REFUNDED: "مبلغ بازگشت داده شد (نمایشی)",
  REJECTED: "رد شده",
};

export const SUBSCRIPTION_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار پرداخت",
  ACTIVE: "فعال",
  EXPIRED: "منقضی شده",
  CANCELED: "لغو شده",
};
