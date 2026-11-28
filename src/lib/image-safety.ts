/**
 * Image path safety (Phase 1, known-issue fix).
 *
 * Rules enforced server-side for EVERY artwork image path:
 *  - must be an absolute in-app path (`/assets/...` curated library or
 *    `/uploads/...` secure storage);
 *  - no `..` segments (path traversal);
 *  - no backslashes; no URL schemes; no double slashes;
 *  - the target must EXIST in the allow-listed roots when checking the FS.
 */

const ALLOWED_PREFIXES = ["/assets/img/", "/uploads/"];

export function normalizeImagePath(raw: string): string | null {
  if (!raw) return null;
  let p = raw.trim();
  if (p.startsWith("http://") || p.startsWith("https://")) return null; // remote not allowed
  if (p.includes("\\") || p.includes("..") || p.includes("//") || p.includes("\0")) return null;
  if (!p.startsWith("/")) p = `/${p}`;
  if (!ALLOWED_PREFIXES.some((prefix) => p.startsWith(prefix))) return null;
  // Restrict to safe file characters; Persian filenames allowed (\p{L}).
  if (!/^\/[\p{L}\p{N}._-]+(\/[\p{L}\p{N}._-]+)*$/u.test(p)) return null;
  // No query/hash fragments, no directory references.
  if (p.includes("?") || p.includes("#") || p.endsWith("/")) return null;
  return p;
}

/** Validate an array of image paths in one pass (drops unsafe entries). */
export function safeImageList(paths: string[]): string[] {
  return paths.map(normalizeImagePath).filter((p): p is string => p !== null);
}
