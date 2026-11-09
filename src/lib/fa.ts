/** Persian (fa-IR) formatting helpers — numerals, currency, dates. */

export function faNum(n: number | string): string {
  const num = typeof n === "string" ? Number(n.replace(/,/g, "")) : n;
  if (Number.isNaN(num)) return String(n);
  return num.toLocaleString("fa-IR", { useGrouping: true });
}

/** Toman price with Persian digits: ۲,۵۰۰,۰۰۰ */
export function faPrice(n: number): string {
  return faNum(n);
}

/** Format a Date as Persian calendar date: ۱۴۰۳/۰۲/۲۸ */
export function faDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Persian date + time */
export function faDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** Latin digits → Persian digits (for codes user typed) */
export function toFaDigits(s: string): string {
  return s.replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

/** Persian digits → Latin (for parsing codes) */
export function toEnDigits(s: string): string {
  return s
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
}

export const ORDER_STATUS_FA: Record<string, string> = {
  PENDING_PAYMENT: "در انتظار پرداخت",
  PAID: "پرداخت شده — در صف آماده‌سازی",
  PREPARING: "در حال آماده‌سازی در کارگاه",
  SHIPPED: "ارسال شده",
  DELIVERED: "تحویل داده شده",
  CANCELLED: "لغو شده",
  PAYMENT_FAILED: "پرداخت ناموفق",
};

export const ARTWORK_STATUS_FA: Record<string, string> = {
  DRAFT: "پیش‌نویس",
  PENDING: "در انتظار بررسی",
  PUBLISHED: "منتشر شده",
  REJECTED: "رد شده",
  ARCHIVED: "بایگانی",
  SOLD: "فروخته شده",
};

export const LAB_STATUS_FA: Record<string, string> = {
  QUEUED: "در صف آزمایشگاه",
  IN_LAB: "در حال بررسی در آزمایشگاه",
  TESTS_DONE: "آزمون‌ها کامل شد",
  ISSUED: "شناسنامه صادر شد",
};

export const AUTH_STATUS_FA: Record<string, string> = {
  VERIFIED: "تایید اصالت",
  PENDING: "در انتظار تایید",
  REJECTED: "عدم تایید",
};

export const SETTLEMENT_STATUS_FA: Record<string, string> = {
  PENDING: "در انتظار بررسی",
  APPROVED: "تایید شده",
  PAID: "واریز شده",
  REJECTED: "رد شده",
};

export const DISCOUNT_AUDIENCE_FA: Record<string, string> = {
  ALL: "همه کاربران",
  BUYER: "ویژه مشتریان",
  ARTISAN: "ویژه استادکاران",
};

export const DISCOUNT_STATUS_FA: Record<string, string> = {
  VALID: "معتبر و قابل استفاده",
  NOT_FOUND: "کد یافت نشد",
  INACTIVE: "کد غیرفعال است",
  NOT_STARTED: "کد هنوز فعال نشده است",
  EXPIRED: "مهلت کد به پایان رسیده است",
  EXHAUSTED: "ظرفیت کد تکمیل شده است",
  USER_LIMIT: "سهمیه شما از این کد تمام شده است",
  AUDIENCE_MISMATCH: "این کد برای نقش حساب شما در نظر گرفته نشده است",
};

/** Persian wording for a discount value («۱۵٪ تخفیف» / «۳۰۰٬۰۰۰ تومان تخفیف») */
export function discountValueFa(kind: string, amount: number): string {
  return kind === "PERCENT" ? `${faNum(amount)}٪ تخفیف` : `${faPrice(amount)} تومان تخفیف`;
}
