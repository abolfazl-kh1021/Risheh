"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { rateLimit, actionIp } from "@/lib/rate-limit";
import type { ActionResult } from "@/lib/actions/auth";
import { MAX_UPLOAD_BYTES, getStorageProvider, reencodeImage, sniffImage } from "@/lib/storage/provider";

/**
 * Secure image upload (S1): magic bytes → size cap → sharp re-encode (EXIF
 * strip) → random name → storage provider. The uploaded path is added to the
 * artwork's image list by the caller (dashboard form keeps it in state).
 */

const uploadSchema = z.object({
  artworkId: z.string().optional(), // when set, appends to that artwork's images
});

export async function uploadImageAction(
  file: { name: string; type: string; buffer: Uint8Array | ArrayBuffer },
  input: z.input<typeof uploadSchema> = {}
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: "ابتدا وارد حساب شوید." };
  if (user.role !== "ARTISAN" && user.role !== "ADMIN") {
    return { ok: false, error: "آپلود تصویر مخصوص استادکاران است." };
  }
  if (!(await rateLimit(`upload|${await actionIp()}`, 20, 10 * 60_000))) {
    return { ok: false, error: "تعداد آپلودها بیش از حد مجاز است؛ کمی بعد تلاش کنید." };
  }
  const parsed = uploadSchema.safeParse(input);
  if (parsed.success && parsed.data.artworkId) {
    const artwork = await db.artwork.findUnique({ where: { id: parsed.data.artworkId } });
    if (!artwork || (artwork.sellerId !== user.id && user.role !== "ADMIN")) {
      return { ok: false, error: "اثر یافت نشد یا مالک آن نیستید." };
    }
  }

  const buf = file.buffer instanceof ArrayBuffer ? Buffer.from(new Uint8Array(file.buffer)) : Buffer.from(file.buffer);
  const sniff = sniffImage(buf); // magic bytes — never trust name/type
  if (!sniff.ok) return { ok: false, error: sniff.error };

  let normalized: Buffer;
  try {
    normalized = await reencodeImage(buf); // strips EXIF/GPS + normalizes
  } catch {
    return { ok: false, error: "پردازش تصویر ناموفق بود؛ فایل خراب است." };
  }

  try {
    const provider = getStorageProvider();
    const { url } = await provider.put(normalized, sniff.ext);

    if (parsed.success && parsed.data.artworkId) {
      const artwork = await db.artwork.findUnique({ where: { id: parsed.data.artworkId! }, select: { images: true } });
      const images = JSON.parse(artwork?.images || "[]") as string[];
      images.push(url);
      await db.artwork.update({
        where: { id: parsed.data.artworkId! },
        data: { images: JSON.stringify(images.slice(0, 8)) },
      });
      revalidatePath("/dashboard/artworks");
    }
    return { ok: true, url };
  } catch (err) {
    if (err instanceof Error && err.message === "STORAGE_UNCONFIGURED") {
      return {
        ok: false,
        error: "سرویس ذخیره‌سازی روی این محیط پیکربندی نشده است؛ از کتابخانه تصاویر ریشه استفاده کنید یا BLOB_READ_WRITE_TOKEN را تنظیم کنید.",
      };
    }
    return { ok: false, error: "ذخیره تصویر ناموفق بود؛ دوباره تلاش کنید." };
  }
}

/** Upload contract for client forms: base64 payload (Server Action friendly). */
export async function uploadImageBase64Action(
  dataUrl: string,
  artworkId?: string
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  if (typeof dataUrl !== "string" || dataUrl.length > (MAX_UPLOAD_BYTES / 3) * 4 + 100) {
    return { ok: false, error: "حجم تصویر باید حداکثر ۵ مگابایت باشد." };
  }
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl);
  if (!match) return { ok: false, error: "قالب فایل نامعتبر است." };
  const buffer = Buffer.from(match[2], "base64");
  return uploadImageAction({ name: "upload", type: match[1], buffer }, { artworkId });
}
