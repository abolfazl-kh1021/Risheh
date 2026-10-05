"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { ensureGuestKey, getCurrentUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/auth";

const addSchema = z.object({
  artworkId: z.string().min(1),
  quantity: z.number().int().min(1).max(10).default(1),
  variant: z.string().max(300).optional().or(z.literal("")),
});

async function cartWhere() {
  const user = await getCurrentUser();
  if (user) return { userId: user.id };
  const guestKey = await ensureGuestKey();
  return { guestKey };
}

export async function addToCartAction(input: z.input<typeof addSchema>): Promise<ActionResult> {
  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "ورودی نامعتبر است" };
  const where = await cartWhere();

  const artwork = await db.artwork.findUnique({ where: { id: parsed.data.artworkId } });
  if (!artwork || artwork.status !== "PUBLISHED") {
    return { ok: false, error: "این اثر در دسترس خرید نیست." };
  }
  if (artwork.stock < 1) {
    return { ok: false, error: "موجودی این اثر به پایان رسیده است." };
  }

  const existing = await db.cartItem.findFirst({
    where: { ...where, artworkId: artwork.id },
  });
  if (existing) {
    const nextQty = Math.min(existing.quantity + parsed.data.quantity, artwork.stock, 10);
    await db.cartItem.update({ where: { id: existing.id }, data: { quantity: nextQty } });
  } else {
    await db.cartItem.create({
      data: {
        userId: where.userId ?? null,
        guestKey: "guestKey" in where ? where.guestKey : null,
        artworkId: artwork.id,
        quantity: Math.min(parsed.data.quantity, artwork.stock),
        variant: parsed.data.variant || null,
      },
    });
  }
  revalidatePath("/");
  return { ok: true, message: "اثر به سبد خرید افزوده شد." };
}

export async function updateCartQuantityAction(
  itemId: string,
  quantity: number
): Promise<ActionResult> {
  const where = await cartWhere();
  const item = await db.cartItem.findFirst({ where: { id: itemId, ...where } });
  if (!item) return { ok: false, error: "ردیف سبد یافت نشد." };
  if (quantity <= 0) {
    await db.cartItem.delete({ where: { id: item.id } });
  } else {
    const artwork = await db.artwork.findUnique({ where: { id: item.artworkId } });
    const max = Math.min(artwork?.stock ?? 1, 10);
    await db.cartItem.update({ where: { id: item.id }, data: { quantity: Math.min(quantity, max) } });
  }
  revalidatePath("/");
  return { ok: true };
}

export async function removeCartItemAction(itemId: string): Promise<ActionResult> {
  const where = await cartWhere();
  const item = await db.cartItem.findFirst({ where: { id: itemId, ...where } });
  if (!item) return { ok: false, error: "ردیف سبد یافت نشد." };
  await db.cartItem.delete({ where: { id: item.id } });
  revalidatePath("/");
  return { ok: true, message: "اثر از سبد حذف شد." };
}

export async function toggleFavoriteAction(artworkId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "برای ذخیره علاقه‌مندی‌ها ابتدا وارد حساب شوید." };
  const existing = await db.favorite.findUnique({
    where: { userId_artworkId: { userId: user.id, artworkId } },
  });
  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return { ok: true, message: "از علاقه‌مندی‌ها حذف شد." };
  }
  await db.favorite.create({ data: { userId: user.id, artworkId } });
  return { ok: true, message: "به علاقه‌مندی‌ها افزوده شد." };
}
