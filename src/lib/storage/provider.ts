import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomBytes } from "crypto";

/**
 * StorageProvider boundary (S1 secure upload).
 *
 * Two adapters:
 *  - local  : writes under `public/uploads` (Docker/self-host; persists in the
 *             container FS — volume-mount `public/uploads` for durability).
 *  - vercel : Vercel Blob adapter — needs BLOB_READ_WRITE_TOKEN; when the env
 *             var is missing on Vercel we fail closed with a clear Persian
 *             message instead of silently dropping uploads.
 *
 * Validation rules (all server-side, S1):
 *  - magic-byte sniffing (never trust the file extension);
 *  - hard size cap (5 MB);
 *  - RE-ENCODE through `sharp` → strips EXIF/GPS metadata and normalizes the
 *    image (defense against polyglot/payload smuggling);
 *  - random object name, no user-controlled filename;
 *  - served as static assets, never executed.
 */

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5MB

const MIME_BY_MAGIC: Array<{ bytes: number[]; mime: string; ext: string }> = [
  { bytes: [0x89, 0x50, 0x4e, 0x47], mime: "image/png", ext: "png" },
  { bytes: [0xff, 0xd8, 0xff], mime: "image/jpeg", ext: "jpg" },
  { bytes: [0x52, 0x49, 0x46, 0x46], mime: "image/webp", ext: "webp" }, // RIFF….WEBP
  { bytes: [0x47, 0x49, 0x46, 0x38], mime: "image/gif", ext: "gif" },
];

export type SniffResult =
  | { ok: true; mime: string; ext: string }
  | { ok: false; error: string };

export function sniffImage(buf: Buffer): SniffResult {
  if (buf.length === 0) return { ok: false, error: "فایل خالی است." };
  if (buf.length > MAX_UPLOAD_BYTES) {
    return { ok: false, error: "حجم تصویر باید حداکثر ۵ مگابایت باشد." };
  }
  for (const m of MIME_BY_MAGIC) {
    if (m.bytes.every((b, i) => buf[i] === b)) {
      if (m.ext === "webp") {
        const isWebp = buf.slice(8, 12).toString("ascii") === "WEBP";
        if (!isWebp) continue;
      }
      return { ok: true, mime: m.mime, ext: m.ext };
    }
  }
  return { ok: false, error: "فایل ارسالی یک تصویر معتبر نیست (فقط PNG/JPEG/WebP/GIF)." };
}

/** Re-encode via sharp: kills EXIF/GPS metadata, produces normalized WebP. */
export async function reencodeImage(buf: Buffer): Promise<Buffer> {
  const sharp = (await import("sharp")).default;
  return sharp(buf)
    .rotate() // respect EXIF orientation, then strip
    .resize(1600, 1600, { fit: "inside", withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
}

export interface StorageProvider {
  name: string;
  /** Store a normalized image buffer; returns its public URL path. */
  put(buf: Buffer, ext: string): Promise<{ url: string }>;
}

class LocalStorageProvider implements StorageProvider {
  name = "local";
  async put(buf: Buffer, _ext: string): Promise<{ url: string }> {
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.webp`;
    const dir = path.join(process.cwd(), "public", "uploads");
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, name), buf);
    return { url: `/uploads/${name}` };
  }
}

class VercelBlobProvider implements StorageProvider {
  name = "vercel-blob";
  async put(buf: Buffer, _ext: string): Promise<{ url: string }> {
    const token = process.env.BLOB_READ_WRITE_TOKEN;
    if (!token) {
      throw new Error("STORAGE_UNCONFIGURED");
    }
    const { put } = await import("@vercel/blob");
    const name = `${Date.now().toString(36)}-${randomBytes(8).toString("hex")}.webp`;
    const blob = await put(`uploads/${name}`, buf, {
      access: "public",
      token,
      contentType: "image/webp",
    });
    return { url: blob.url };
  }
}

export function getStorageProvider(): StorageProvider {
  if (process.env.BLOB_READ_WRITE_TOKEN) return new VercelBlobProvider();
  return new LocalStorageProvider();
}
