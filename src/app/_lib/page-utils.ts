import type { AppData } from "@/lib/types";

/**
 * Shared page helpers (server-side).
 */

export type SP = Record<string, string | string[] | undefined>;

export function one(sp: SP, key: string): string | undefined {
  const v = sp[key];
  return typeof v === "string" && v !== "" ? v : undefined;
}

export function numOf(sp: SP, key: string): number | undefined {
  const raw = one(sp, key);
  if (raw === undefined) return undefined;
  const n = Number(raw.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))));
  return Number.isFinite(n) ? n : undefined;
}

export function boolOf(sp: SP, key: string): boolean {
  return one(sp, key) === "1";
}

export function queryOf(sp: SP): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(sp)) {
    if (typeof v === "string" && v) out[k] = v;
  }
  return out;
}

export const SORT_IDS = ["newest", "price-asc", "price-desc", "rating"] as const;
export type SortId = (typeof SORT_IDS)[number];

export function sortOf(sp: SP): SortId {
  const raw = one(sp, "sort");
  return SORT_IDS.includes(raw as SortId) ? (raw as SortId) : "newest";
}

/** Bare data skeleton (user/categories filled by each page). */
export function bareData(user: AppData["user"] = null): AppData {
  return { user, categories: [] };
}
