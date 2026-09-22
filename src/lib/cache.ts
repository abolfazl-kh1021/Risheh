/**
 * Tiny cache-aside helper for the public catalog read pass (PERFORMANCE.md item 23).
 *
 * Why not Redis/Upstash: the sandbox constraint (and the demo deployment) uses a
 * local SQLite file and a single Node process — an in-process TTL cache gives
 * the same stampede protection with zero new services. `redisCache` below shows
 * the exact swap point for a production Redis/Upstash backend.
 *
 * - TTL cache with per-key in-flight promise sharing (stampede protection)
 * - explicit invalidation on catalog-affecting writes (artworks/admin/orders)
 */

type Entry<T> = { value: T; expiresAt: number };

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const DEFAULT_TTL_MS = 10_000; // 10s: demo data stays fresh enough after actions

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    store.clear();
    return;
  }
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) store.delete(key);
  }
}

export async function cached<T>(
  key: string,
  ttlMs: number,
  loader: () => Promise<T>
): Promise<T> {
  const now = Date.now();
  const hit = store.get(key) as Entry<T> | undefined;
  if (hit && hit.expiresAt > now) return hit.value;

  // stampede protection: share the in-flight loader between requests
  const pending = inflight.get(key) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = loader()
    .then((value) => {
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })
    .finally(() => inflight.delete(key));
  inflight.set(key, promise);
  return promise;
}

/** Production swap point: replace `cached()` internals with Redis get/setex. */
export const redisCache = {
  async get<T>(_key: string): Promise<T | null> {
    return null; // Upstash REST call goes here (REDIS_URL required)
  },
  async set(_key: string, _value: unknown, _ttlSeconds: number): Promise<void> {},
};

export const PUBLIC_CATALOG_KEY = "public-catalog:v2";
export const PUBLIC_CATALOG_TTL_MS = DEFAULT_TTL_MS;
