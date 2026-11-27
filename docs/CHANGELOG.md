# CHANGELOG.md

All notable changes. Dates are build-session-relative (single working session).

## [0.13.0] — Dedicated app download page (#/app)
## [Unreleased] — Week 13 readiness (2026-11-27)
- fix(orders): atomic, idempotent payment finalization; guarded stock decrement in a
  single transaction; cancel-after-pay restores stock and reverses ledger entries.
- feat(checkout): server-authoritative discount codes at checkout (fixed + percent,
  caps, audience, per-user limit); `orders.discountCodeId` additive migration;
  cart coupon box now performs a real server check.
- fix(ledger): SALE/COMMISSION written from post-discount net shares (10% exact).
- fix(admin): ADMIN role now loads the shop-orders pipeline (was artisan-only).
- fix(ui): categories view syncs with header search; product view state resets per artwork;
  verify-page footer chips wrap at narrow widths; OTP tab input disabled (out of scope).
- docs(verifiy): honest M10 wording — in-app records, not an external lab certificate.
- chore(ts): 17 latent type errors fixed; tsconfig excludes examples/mini-services/scripts.

### Added
- `AppView` (`#/app`): a standalone download page for visitors who cannot scan the QR —
  hero with app icon + «نصب رایگان / بدون فروشگاه اپ / حجم کم» badges, a dark-teal
  download card (matching the homepage install card) whose PRIMARY action is the gold
  «دانلود برنامه» button, a live QR (encodes `<origin>/#/app` so scans land exactly on
  this page), six app-feature cards, three per-platform install-step cards
  (Android/iOS/desktop, Persian numerals), and a 3-item FAQ accordion.
- `lib/install-prompt.ts`: shared `beforeinstallprompt` store — the event is captured at
  module-import time (before any component mounts) and offered to all install surfaces
  via `useSyncExternalStore`; `consumeInstallEvent()` makes the one-shot prompt safe.
- Entry points to the page: «صفحه دانلود اپ» link in the homepage install section,
  «نصب اپلیکیشن» in the mobile drawer (after استعلام اصالت) and in the footer customer
  services column, plus a «نصب اپلیکیشن» shortcut in `manifest.webmanifest`.

### Changed
- `AppInstallSection` now uses the shared install store (an early browser prompt is no
  longer missed); download button behavior on `#/app`: native install dialog when the
  event exists, iOS Add-to-Home-Screen guide on iPhone UA, browser-menu manual guide
  as the click fallback otherwise.

### Fixed
- `HeroCarousel` reduced-motion check used `reducedMotion.current` on a boolean — the
  560ms transition never disabled for users preferring reduced motion.

## [0.12.0] — Launch-readiness: carousel, search 404, drawer UX, app install

### Added
- `HeroCarousel` (homepage): timed autoplay (5s, pauses on hover/focus/drag and when the
  tab is hidden), pointer/touch drag BOTH directions (LTR track inside the RTL page),
  clickable dots, NO arrows; five slides each promoting a different site section with its
  own curated image (store, authenticity verification, blog, about/ateliers, app install).
- `AppInstallSection` (homepage, `#app-install`): compact app card with icon, three key
  features and a REAL install path — native `beforeinstallprompt` prompt on Chromium,
  iOS Add-to-Home-Screen guide, installed-state pill, and a live QR code generated from
  the current origin (`qrcode.react`) so scanning it on any deployment opens the site on
  the visitor's phone and completes installation as a PWA.
- `NotFoundView` — branded 404 page used for (a) search queries with no matches in the
  database (CategoriesView), (b) unknown hash routes (RishehApp), (c) missing artworks
  (ProductView); always offers browse/home actions + category suggestions.
- Mobile drawer: search bar at the very top (directly above «خانه»), submits to
  `categories/all?q=` and closes the drawer.
- Drawer «سفارش‌ها و پیگیری» for signed-in users; ARTISAN gets «مدیریت آثار من».

### Changed
- Drawer is role-aware: «تخفیف‌ها و کدهای هدیه» and the desktop utility-bar «تخفیف‌ها»
  are hidden for guests (visible after ورود/ثبت‌نام); «پیشخوان مدیریت» shows only for
  ADMIN. `DiscountsView` itself now shows a login gate for guests (hooks-safe).
- Drawer links: taller tap targets (min-h-11, py-3) + Escape closes the drawer.

### Fixed
- Hydration mismatch on deep links (`#/product/x`, `#/login` reload): the hash router now
  renders the SSR-consistent «home» state first and adopts the real hash right after
  hydration — no React hydration error, server HTML is reused.
- Hero carousel slide backgrounds: slides were missing `relative`, so every slide's
  absolute background stacked on the track instead of its own slide — each slide now
  clips its own image (`relative overflow-hidden`); section slides show their image
  clearly (no luminosity blend), hero slide keeps the original treatment.
- `onPointerLeaveCapture` was an invalid React handler (pointerleave does not bubble) —
  autoplay-resume now rides the plain `onPointerLeave`.
- Inputs on phones are forced to 16px with `!important` — Tailwind cascade layers were
  letting `text-body-sm`/`text-[14px]` utilities defeat the base rule, so Safari still
  zoomed into search/login fields on focus.

## [0.11.0] — Installable mobile web app (PWA)

### Added
- Web app manifest, service worker (offline page + static asset cache), generated icons
  (192/512, maskable, apple-touch).
- `MobileTabBar`: app-style bottom navigation (خانه، دسته‌ها، علاقه‌مندی، سبد، حساب) below `md`.
- `PwaProvider`: install card (Android/Chromium + iOS Safari hint), offline banner.
- Safe-area support (`viewport-fit=cover`), 16px inputs on phones, touch-action tuning.
- Home categories became a swipeable row on phones; drawer gained «علاقه‌مندی‌ها».

## [0.10.1] — Responsive pass & category/CTA fixes

### Fixed
- Header is now `sticky` (was `fixed` + a 104px offset that was ~20px too short), so it no
  longer covers the category chip bar on `#/categories/*`.
- Category chips wrap on md+ (scroll with snap on phones) so «تابلو، نگارگری، خوشنویسی و نقاشی»
  is never clipped; `src/lib/categories.ts` guarantees all 8 canonical categories are present
  even if the local DB was seeded before the 8th existed.

### Changed
- `ProductCard`: redesigned «افزودن به سبد» CTA (full-width gradient button + gold icon bubble),
  price row on its own line, 2-line title clamp.
- Responsive: mobile search row in header, nav at `xl`, drawer lists all categories,
  fluid type/gutter tokens in `globals.css`, responsive headings on About/Blog/Contact/Verify/
  Login/Product, product purchase row wraps on phones, footer grid 1/2/4 columns, cart touch targets.

## [0.10.0] — Docker & CI/CD

### Added
- `Dockerfile` — multi-stage (deps → build → runner): Bun for lockfile-exact
  installs, production build on Node 22 with Next standalone output, non-root
  runtime (uid 1001), `HEALTHCHECK` on `/api/health`.
- Demo DB baked into the image: builder runs `prisma db push` + seed; pristine
  SQLite stored at `/opt/seed-db`; `docker/entrypoint.sh` restores it on first
  boot so `docker run` works out of the box from a fresh clone.
- `docker-compose.yml` — web service with named volume `risheh-db` (`/app/db`),
  healthcheck, `restart: unless-stopped`; commented Postgres service as the
  pre-staged datasource swap path.
- `.dockerignore` — secrets (`/.env*`) never enter the build context; sandbox
  artifacts, docs and stale runtime data excluded.
- `.github/workflows/ci.yml` — on push to `main` and PRs:
  - `quality`: `bun install --frozen-lockfile` → prisma generate + SQLite schema
    in `$RUNNER_TEMP` → `lint` → `build` (first place the production build is
    verified, since the dev sandbox cannot run `next build`).
  - `docker`: Buildx build with GHA cache → container smoke test (boot +
    `/api/health` polling) → publish `ghcr.io/<owner>/<repo>:latest` +
    `:sha-<sha>` on main (built-in `GITHUB_TOKEN`, no extra secrets).
- `/api/health` — DB-free liveness probe for Docker, Compose and CI.
- `package.json`: `db:seed` script.

### Changed
- Seed data moved into the repo: `prisma/seed-data/{catalog,asset_map}.json`
  (was: gitignored `risheh-source/refs/`) — `prisma/seed.ts` updated; seeding
  now works from a fresh GitHub clone.
- `docs/DEPLOYMENT.md`: §8 Docker, §9 CI/CD pipeline, honest-status header.

## [0.9.0] — Performance, loading UX & responsiveness pass

### Added
- Logo splash screen: `src/risheh/SplashScreen.tsx` + route-level `loading.tsx`
  (emblem + spinner ring, streamed from the HTML shell) and `ViewFallback.tsx`
  skeletons for lazily-loaded views.
- Code splitting: 10 heavy views dynamically imported (`RishehApp.tsx`).
- RUM: `web-vitals` (LCP/INP/CLS/TTFB/FCP) beacon → `src/app/api/vitals/route.ts`.
- TTL cache-aside for the public catalog with stampede protection and explicit
  invalidation on catalog-affecting writes (`src/lib/cache.ts`).
- `useDebouncedValue` hook (300 ms) applied to categories search.
- Optimistic favorites with rollback + error toast.
- `docs/PERFORMANCE.md`: full 31-item audit table, metrics, manual steps.

### Performance
- Images: 198 files JPEG/PNG → optimized WebP (31.6 MB → 13 MB, logo
  1.8 MB → 91 KB; hero kept at 1600px/q80). References in seed + refs JSONs
  rewritten; DB re-seeded; zero broken links (browser sweep).
- Icon font subsetted via official codepoints: Material Symbols 3.8 MB → 114 KB
  (liga ligatures preserved; sweep-verified in all views).
- `next.config.ts`: AVIF/WebP image formats, cache headers (fonts immutable 1y,
  images 30d+SWR, vitals no-store), `compress: true`.
- Data layer: cart filtered in DB (was: load all visitors' carts), artisan
  branch reads parallelized (6 sequential awaits → Promise.all), admin revenue
  via `aggregate(_sum)`, favorites `select` minimal.
- Prisma indexes: reviews(artworkId), favorites(artworkId),
  verification_events(recordId), lab_requests(sellerId, artworkId).
- Fonts preloaded (React 19 `preload()`), hero LCP images `fetchPriority=high`.

### Verified
- Lint 0 errors; browser E2E: splash, home desktop/mobile 390/768, product
  (dynamic chunk), categories search, admin panel (dynamic chunk + aggregate),
  optimistic favorite flow, sticky footer; zero image 404s; no horizontal
  overflow 360→1536px; TTFB 42 ms warm.

## [0.8.0] — Phases 0–8 complete (this build)

### Added
- Full Risheh application: 17 views (storefront, discovery, product, cart/checkout,
  demo payment gateway + results, auth, buyer/artisan dashboards, artwork CRUD,
  orders/shipping, finance/settlements, authenticity lab, public verification,
  admin operations, favorites) in a hash-routed SPA at `/`.
- Design system: both source palettes (M3 tonal + home brand), Vazirmatn +
  Material Symbols self-hosted, ornamental utilities (`.ornament-line`,
  `.persian-gold-gradient`, `.craft-shadow`, persian patterns), warm elevations.
- Data layer: 20 Prisma models; seed with verbatim source content (58 artworks,
  8 categories, 7 blog posts, 4 subscription plans, demo users/orders/ledger).
- Server Actions: auth (scrypt + httpOnly sessions), cart (guest + user),
  orders (server totals, stock checks, validated transitions), demo payment
  (server-issued authority, idempotent verification, ledger writes),
  artwork CRUD (ownership checks), admin ops (server role gate, audit log),
  public verification, contact/newsletter.
- Documentation system: CLAUDE.md, README, 11 docs/* files, docs/skill manifest,
  docs/reference (original contract), .env.example, .gitignore.
- Asset pipeline: 120 curated images (70 remote Stitch images downloaded),
  fonts, generated home-image map module.

### Fixed (during browser verification)
- Product view `artworkId` prop not destructured (runtime error).
- Next.js App Router clobbering hash URLs on `router.refresh()` — URL sync fix in
  the hash router.
- Payment result race for guests (loading state + server-verified in-memory result).
- Cart not cleared after successful payment; variant JSON rendered raw → chips.
- Nested `<button>` hydration error in blog grid.
- Missing/incorrect image assignments (hero rug gallery, vase image).

### Security
- scrypt password hashing, timing-safe compare, signed httpOnly sessions.
- Server-side role/ownership checks on every action; Zod validation everywhere.
- Rate limiting on auth/contact/newsletter/verification/settlement endpoints.
- No card/CVV storage (none collected); demo payment labeled explicitly.

### Known gaps (honest)
- Production build not yet run (sandbox constraint) — see HANDOFF.md.
- GitHub push / Vercel deploy not performed (user actions).
- No unit/E2E automated suites committed; OTP/email/uploads/providers absent
  (demo-labeled); in-memory rate limiter.

## [0.1.0] — Phase 0
- Archive audit, inventory, asset mapping, documentation bootstrap, scaffold.
