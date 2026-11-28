import { db } from "@/lib/db";

/**
 * Platform settings reader — every tunable economic number lives in the
 * `settings` table (admin-editable) with a safe default here. NO economic
 * constant may be hardcoded in business logic (scope §۲.۱, rule ۴).
 */

export const SETTING_DEFAULTS = {
  /** Listing validity window in days after publish (scope §۴.۲: default ۶۰). */
  LISTING_ACTIVE_DAYS: 60,
  /** Refund the listing fee as credit when a listing is REJECTED (scope §۴.۲). */
  LISTING_FEE_REFUND_ON_REJECT: true,
  /** Stock reservation window in minutes (scope Phase 1: ۱۵ دقیقه). */
  RESERVATION_MINUTES: 15,
  /** How long a PENDING_PAYMENT order may live before cron expires it. */
  PENDING_PAYMENT_TTL_MINUTES: 60,
  /** Money retention (pseudo-escrow) days after DELIVERED (scope §۴.۵: N). */
  RETENTION_DAYS: 3,
  /** Default sale commission in basis points (scope: ۱۰٪ = 1000). */
  DEFAULT_COMMISSION_BPS: 1000,
} as const;

export type SettingKey = keyof typeof SETTING_DEFAULTS;

function coerce(key: SettingKey, raw: string | undefined | null): number | boolean {
  const def = SETTING_DEFAULTS[key];
  if (raw === undefined || raw === null || raw === "") return def;
  if (typeof def === "boolean") return raw === "true" || raw === "1";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : def;
}

/** Read a single numeric setting. */
export async function getNumberSetting(key: SettingKey): Promise<number> {
  const row = await db.setting.findUnique({ where: { key } });
  const v = coerce(key, row?.value);
  return typeof v === "number" ? v : SETTING_DEFAULTS[key] as number;
}

/** Read a single boolean setting. */
export async function getBoolSetting(key: SettingKey): Promise<boolean> {
  const v = coerce(key, (await db.setting.findUnique({ where: { key } }))?.value);
  return typeof v === "boolean" ? v : SETTING_DEFAULTS[key] as boolean;
}

/** Read all settings as a plain map (admin panel / cron). */
export async function getAllSettings(): Promise<Record<string, string>> {
  const rows = await db.setting.findMany();
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(SETTING_DEFAULTS)) out[k] = String(v);
  for (const r of rows) out[r.key] = r.value;
  return out;
}

/** Upsert one setting (admin action). */
export async function setSetting(key: string, value: string, group = "general", description?: string): Promise<void> {
  await db.setting.upsert({
    where: { key },
    create: { key, value, group, description },
    update: { value },
  });
}
