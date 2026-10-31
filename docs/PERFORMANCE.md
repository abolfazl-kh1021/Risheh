# PERFORMANCE.md — audit, upgrades and metrics (2026-11-09)

Scope: full performance/scalability/observability pass over the Risheh app,
requested alongside three explicit user priorities: smaller images, a logo
loading screen, and full-device responsiveness.

## Before/after metrics (dev server, desktop viewport)

| Metric | Before | After | How to reproduce |
| --- | --- | --- | --- |
| Image payload on disk | 31.6 MB (200 files, JPEG/PNG) | **13 MB** (201 files, WebP) | `du -sh public/assets/img` |
| Logo file | 1.8 MB PNG ×2 | **91 KB** webp + 3/5 KB png icons | `ls -la public/assets/img/logo-mark*` |
| Icon font | 3.8 MB full Material Symbols | **114 KB** subset | `ls -la public/assets/fonts` |
| Fonts total transfer | ~4.0 MB | **~214 KB** | `performance.getEntriesByType('resource')` |
| TTFB (home, warm) | 1085 ms (cold compile) | **42 ms** | dev.log `[vitals] TTFB` |
| SSR render of `/` | ~100 ms | 62 ms | dev.log `GET / 200` |
| Image 404s | — | **0** after ref fixes | `grep -c " 404 " dev.log` (sweep all views) |
| Horizontal overflow | — | none 360→1536px | overflow eval script, see Testing checklist |
| CLS risk | unknown | controlled: aspect-ratio boxes + sized logo | Web Vitals beacon |

Note: JS chunk sizes are only meaningful in a production build (`bun run build`),
which the sandbox forbids (documented in TESTING.md). In dev the payload is
dominated by Next.js dev tooling (~219 KB) — not representative.

## Audit — 31 items (status: ✅ done / 🟡 partial / ⛔ N-A with reason)

| # | Item | Status | Where |
| --- | --- | --- | --- |
| 1 | Loading skeletons / logo splash | ✅ | `src/app/loading.tsx` + `SplashScreen.tsx` (logo splash during SSR), `ViewFallback.tsx` (skeleton for lazy views) |
| 2 | Modern image formats | ✅ | All 198 raster images → WebP (q78–80, ≤1200px, hero 1600px); `next.config.ts` `images.formats=[avif,webp]` ready for `next/image` migration |
| 3 | Lazy-load images / LCP priority | ✅ | Grid images `loading=lazy decoding=async`; hero LCP images `fetchPriority=high`; fonts preloaded via React 19 `preload()` |
| 4 | SSR/SSG per route | 🟡 | Single-route SPA by sandbox constraint (ARCHITECTURE.md). `/` is dynamic SSR (session-dependent). Documented; route-split would enable SSG/ISR per view |
| 5 | Code splitting | ✅ | 10 heavy views via `next/dynamic` in `RishehApp.tsx` (product/payment/verify/dashboard/artworks/orders/finance/lab/admin/favorites) |
| 6 | Virtualized lists | ⛔ | Largest list = 58 artworks + capped tables (≤40 rows with `take`). Virtualization overhead not justified; revisit if catalog >500 |
| 7 | Prevent re-renders | ✅ minimal | Filters/sort in `useMemo`, handlers `useCallback`, stable keys. `React.memo` on ProductCard deliberately NOT added (function-prop identities change per interaction; measurable gain ≈ 0) |
| 8 | Self-hosted fonts | ✅ | Vazirmatn subsets woff2 (100 KB total) + `font-display: swap` + `preload()`; icon font subsetted 3.8 MB → 114 KB |
| 9 | Third-party scripts | ✅ N-A | Zero third-party scripts (no analytics/chat); `WebVitals` beacon is first-party and post-interactive |
| 10 | Remove unused packages | 🟡 | 13 scaffold deps have zero imports (dnd-kit, mdxeditor, framer-motion, next-auth, next-intl, react-query, react-table, syntax-highlighter, react-markdown, zustand, uuid, date-fns, @reactuses/core). **Not removed** — never imported ⇒ zero bundle impact; removal risks lockfile churn for no user-visible gain. Cleanup commands listed below |
| 11 | Request deduplication | ✅ N-A | Server-side render passes data once; stampede protection added via in-flight promise sharing in cache (`cache.ts`) |
| 12 | Debounced search | ✅ | `useDebouncedValue(300ms)` in CategoriesView; filtering is client-side (no network) ⇒ AbortController N-A |
| 13 | API pagination | 🟡 | All list reads already capped (`take: 24/40/50`, orders filtered by user). Public catalog is 58 items — paging deferred to route-split phase; documented |
| 14 | API timeouts | ⛔ N-A | No outbound HTTP in the stack (demo payment/OTP are local adapters). `fetch` used only by vitals beacon with `keepalive` |
| 15 | Parallel requests | ✅ | `loadAppData`: user+guest parallel, catalog 3 queries parallel, artisan branch 6 reads parallel (was sequential), admin branch already parallel |
| 16 | Optimistic updates | ✅ | Favorites: instant flip + rollback + error toast (`RishehApp.tsx`), duplicate-click guard |
| 17 | Streaming AI responses | ⛔ N-A | No AI features in the product |
| 18 | N+1 queries | ✅ | Catalog uses `include` eager loading (was already); cart items eager-load artwork+seller; category counts derive from the loaded set, not per-row COUNT |
| 19 | Select only needed | ✅ | Cart query filtered in DB (`where userId/guestKey`) instead of loading all visitors' carts; favorites `select: { artworkId }`; revenue via `aggregate(_sum)` instead of loading all orders |
| 20 | DB indexes | ✅ | Added: `reviews(artworkId)`, `favorites(artworkId)`, `verification_events(recordId)`, `lab_requests(sellerId, artworkId)`. Existing FK indexes kept. Applied via `db:push` (SQLite); for Postgres use `prisma migrate dev` |
| 21 | Connection pooling | ⛔ N-A | SQLite file + single Node process; Prisma manages a single connection. For Postgres/Vercel: use Neon/Supabase pooler or Prisma Accelerate (DEPLOYMENT.md) |
| 22 | Region co-location | 🟡 | DB is a local file today. When moving to Postgres: set Vercel function region = DB region (recommended `bme1` Bahrain for Iran audience) |
| 23 | Redis caching | ✅ (local) | `src/lib/cache.ts`: TTL cache-aside (10s) for the public catalog + stampede protection + explicit invalidation on catalog writes. Redis swap point documented in-file (skill constraint: local-memory caching in sandbox) |
| 24 | Background job queue | ⛔ N-A | No emails/SMS/uploads/exports configured (demo adapters). Nothing slow runs in-request (payment is DB-local). Inngest/QStash noted for provider integration |
| 25 | Compression | ✅ | `next.config.ts` `compress: true` (gzip); Vercel adds Brotli at the edge automatically. Verify: `Content-Encoding` response header on `/` |
| 26 | CDN | ✅ | Vercel Edge Network serves `/_next/static` + `public/` automatically; headers configured below |
| 27 | Browser caching | ✅ | `headers()`: fonts `immutable, 1y`; images `30d + stale-while-revalidate=1d`; `/api/vitals` `no-store` |
| 28 | Load balancer | ⛔ N-A | Vercel provides LB + autoscaling; no self-hosted component exists |
| 29 | OpenTelemetry | 🟡 | Full OTel exporter skipped (cold-start cost + no collector configured). Server actions log errors; dev.log captures query traces (`prisma:query`). Swap-in `@opentelemetry/sdk-node` when a backend exists |
| 30 | Real-user monitoring | ✅ | `web-vitals` (LCP/INP/CLS/TTFB/FCP) beaconed to `/api/vitals`, logged server-side; Vercel Speed Insights can be enabled in addition (marketplace) |
| 31 | Slow-device/network testing | ✅ | Checklist below; verified via 360–1536px overflow sweep + throttled vitals beacon |

## User-priority results

1. **Images** — 31.6 MB → 13 MB on disk (−58%); logo 1.8 MB → 91 KB; every image
   WebP; home payload 841 KB/16 imgs (first paint needs ~10 lazy-loaded files).
2. **Loading screen** — full-screen splash with the Risheh emblem, brand teal
   gradient, breathing logo + spinner ring + Persian loading dots, shown from
   the streamed HTML shell (`loading.tsx`) — visible on every cold load/slow
   network; lazy view switches get matching skeletons instead.
3. **Responsive** — verified no horizontal overflow at 360/390/768/1024/1280/1536
   px across home/categories/cart/blog/product; mobile drawer, sticky footer and
   44px touch targets confirmed via browser sweep.

## Manual steps for production (Vercel)

1. `bun run build` locally (sandbox forbids it) and fix anything it surfaces.
2. Vercel: enable **Speed Insights** (optional — app already beacons to `/api/vitals`).
3. If moving to Postgres: set `regions = ["bme1"]` in `next.config.ts` or vercel.json
   to co-locate with the DB, and add a pooled `DATABASE_URL`.
4. Optional cleanup (no bundle impact, install-size only):
   `bun remove @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities @mdxeditor/editor @reactuses/core @tanstack/react-query @tanstack/react-table date-fns framer-motion next-auth next-intl react-markdown react-syntax-highlighter uuid zustand`

## Testing checklist (slow device / slow network)

- Chrome DevTools → Performance → CPU "4× slowdown" + Network "Slow 4G":
  reload `/` → splash appears instantly (streamed shell), then home paints.
- Lighthouse mobile (device: Moto G, throttled): expect image/CLS/TFA audits to pass;
  record LCP before/after any further image change.
- WebPageTest: 3G profile from a near-Iran location; first-view should show
  ≤ ~1 MB transferred (13 KB splash HTML + fonts ~214 KB + first images).
- Re-run the overflow sweep (viewports 360→1536 × views home/categories/cart/blog/product)
  after any layout-affecting change.
- Icons: after editing any `MSymbol` usage, regenerate the subset
  (`scripts/subset_icons_gsub.py`) and sweep views for tofu glyphs.

## Intentionally skipped / trade-offs

- Route-split for SSG/ISR + per-view pagination: bundled into the existing
  Phase-9 hardening item (HANDOFF.md §C1) — it changes URL structure, so it
  stays a deliberate migration, not a drive-by edit.
- Full OTel: cold-start cost with no collector — replaced by structured logs.
- `React.memo` everywhere: profiling showed prop churn negates it.
- Removing unused scaffold packages: zero runtime benefit, real lockfile risk.
- WebP quality kept at q78–80 (art marketplace — visible artifacts would be
  worse than the extra ~90 KB/page).
