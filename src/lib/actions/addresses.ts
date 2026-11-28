"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import type { ActionResult } from "@/lib/actions/auth";
import { toEnDigits } from "@/lib/fa";

/**
 * Address book (Phase 3) — saved addresses for signed-in buyers.
 */

const addressSchema = z.object({
  title: z.string().min(2, "عنوان نشانی الزامی است").max(60),
  receiverName: z.string().min(2, "نام تحویل‌گیرنده الزامی است").max(60),
  phone: z
    .string()
    .transform((v) => toEnDigits(v).replace(/\s/g, ""))
    .pipe(z.string().regex(/^09\d{9}$/, "شماره موبایل معتبر نیست")),
  province: z.string().min(2, "استان الزامی است").max(40),
  city: z.string().min(2, "شهر الزامی است").max(40),
  postalCode: z
    .string()
    .transform((v) => toEnDigits(v))
    .refine((v) => v === "" || /^\d{10}$/.test(v), "کد پستی باید ۱۰ رقم باشد")
    .optional()
    .or(z.literal("")),
  line1: z.string().min(10, "نشانی کامل الزامی است").max(500),
  isDefault: z.boolean().optional().default(false),
});

export async function saveAddressAction(input: z.input<typeof addressSchema>): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const parsed = addressSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "ورودی نامعتبر است" };
  const d = parsed.data;
  await db.address.create({
    data: {
      userId: user.id,
      title: d.title.trim(),
      receiverName: d.receiverName.trim(),
      phone: d.phone,
      province: d.province.trim(),
      city: d.city.trim(),
      postalCode: d.postalCode || null,
      line1: d.line1.trim(),
      isDefault: d.isDefault ?? false,
    },
  });
  if (d.isDefault) {
    const newest = await db.address.findFirst({
      where: { userId: user.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (newest) {
      await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
      await db.address.update({ where: { id: newest.id }, data: { isDefault: true } });
    }
  }
  revalidatePath("/cart");
  return { ok: true, message: "نشانی ذخیره شد." };
}

export async function deleteAddressAction(addressId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const addr = await db.address.findUnique({ where: { id: addressId } });
  if (!addr || addr.userId !== user.id) return { ok: false, error: "نشانی یافت نشد." };
  await db.address.update({ where: { id: addressId }, data: { deletedAt: new Date(), isDefault: false } });
  revalidatePath("/cart");
  return { ok: true, message: "نشانی حذف شد." };
}

export async function setDefaultAddressAction(addressId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  const addr = await db.address.findUnique({ where: { id: addressId } });
  if (!addr || addr.userId !== user.id) return { ok: false, error: "نشانی یافت نشد." };
  await db.address.updateMany({ where: { userId: user.id }, data: { isDefault: false } });
  await db.address.update({ where: { id: addressId }, data: { isDefault: true } });
  revalidatePath("/cart");
  return { ok: true, message: "نشانی پیش‌فرض تغییر کرد." };
}
