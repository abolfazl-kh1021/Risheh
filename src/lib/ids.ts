import { randomBytes } from "crypto";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/**
 * Collision-free unique identifiers generated with a CSPRNG (crypto), never
 * Math.random (known-issue fix: 89,999 combinations + no retry → P2002).
 * Every generator retries on a unique-constraint violation (P2002).
 */

function randToken(bytes: number): string {
  return randomBytes(bytes).toString("hex").toUpperCase();
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

/** Order number: RSH-ORD-<yymmdd>-<6 hex> (retries on collision). */
export async function uniqueOrderNumber(): Promise<string> {
  const date = new Date();
  const ymd = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    const candidate = `RSH-ORD-${ymd}-${randToken(3)}`;
    const exists = await db.order.findUnique({ where: { orderNumber: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error("order number collision after 5 attempts");
}

/** Invoice number: RSH-INV-<yymmdd>-<6 hex>. */
export async function uniqueInvoiceNumber(): Promise<string> {
  const date = new Date();
  const ymd = `${String(date.getFullYear()).slice(2)}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
  for (let i = 0; i < 5; i++) {
    const candidate = `RSH-INV-${ymd}-${randToken(3)}`;
    const exists = await db.invoice.findUnique({ where: { number: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error("invoice number collision after 5 attempts");
}

/** Artwork code: RSH-<5 digits>, retried against the DB on collision. */
export async function uniqueArtworkCode(): Promise<string> {
  for (let i = 0; i < 8; i++) {
    const candidate = `RSH-${10000 + (parseInt(randToken(2), 16) % 89999)}`;
    const exists = await db.artwork.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  throw new Error("artwork code collision after 8 attempts");
}

/**
 * Persian-friendly slug from a title + random suffix. Persian letters are
 * preserved (\p{L}), spaces become dashes, unsafe chars stripped.
 */
export function slugify(title: string): string {
  const base = title
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}-]/gu, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48)
    .replace(/-+$/, "");
  return `${base || "item"}-${randToken(2).toLowerCase()}`;
}

/** Unique artwork slug with DB check + retry (slug is @unique). */
export async function uniqueArtworkSlug(title: string): Promise<string> {
  for (let i = 0; i < 6; i++) {
    const candidate = slugify(title);
    const exists = await db.artwork.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `item-${randToken(4).toLowerCase()}`;
}

/** Hologram code for the digital authenticity record. */
export function hologramCode(artworkCode: string): string {
  return `${artworkCode}-H${parseInt(randToken(2), 16) % 9000 + 1000}`;
}
