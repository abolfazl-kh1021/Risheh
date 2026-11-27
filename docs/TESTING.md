# TESTING.md

## Session 2026-11-27 — Week 13 readiness pass (this build)

Environment: local **production build** (`bun run build` → standalone server on
`bun server.js`, port 3000) against a local PostgreSQL 19 (embedded, `scripts/local-db.ts`)
seeded with `bun prisma/seed.ts`. Browser E2E via agent-browser (1280×800 + 390×844).

### 1. Static checks

| Check | Command | Result |
| --- | --- | --- |
| TypeScript (`strict`) | `bunx tsc --noEmit` | ✅ **0 errors** (fixed 17 pre-existing errors that `ignoreBuildErrors` used to mask) |
| ESLint | `bunx eslint .` | ✅ **0 errors, 0 warnings** |
| Production build | `bun run build` | ✅ clean (`✓ Compiled successfully`, standalone output) |
| Template noise | tsconfig now excludes `examples/`, `mini-services/`, `scripts/` from typecheck | ✅ |

### 2. Buyer journey (production build, seeded DB)

| Step | Result |
| --- | --- |
| Home renders: hero, 8 categories, featured grid, RTL Persian | ✅ |
| Categories: search + sort + verified-only filter + combined queries, branded 404 for unmatched search, inline empty state for filters | ✅ |
| Header search while already inside categories view now updates results (state-sync fix) | ✅ |
| Login (buyer@risheh.ir / risheh1403) → dashboard redirect | ✅ |
| Add to cart → cart: qty +/− (stock-capped), remove, invoice summary | ✅ |
| **Checkout discount — FIXED code** (`WELCOME-GIFT`, 300,000 T cap/min respected): server recomputes, order stores `discount=300000`, total `6,590,000→6,290,000` | ✅ |
| **Checkout discount — PERCENT code** (`MIRAS-WEEK`, 10%): order `subtotal=16,650,000`, `discount=1,665,000`, `total=14,985,000` | ✅ |
| Demo gateway SUCCESS: order PAID, `DEMO-REF-*`, cart cleared, stock decremented, tracking `PENDING_PAYMENT → PAID` | ✅ |
| Demo gateway CANCELLED: order CANCELLED, **cart preserved** | ✅ |
| Demo gateway FAILED: order PAYMENT_FAILED, «تلاش مجدد» offered | ✅ |
| Order history: three orders with distinct Persian statuses, payment info labeled «نمایشی (بدون انتقال پول)», tracking timeline | ✅ |

### 3. Ledger / commission consistency (M8) — asserted in DB after every paid order

- `SALE` entries use **net (post-discount) per-item shares**; rounding residue on last item.
- `COMMISSION` = exactly `−round(SALE × 0.10)` per seller (asserted `commissionIs10pct`).
- Σ(SALE) across sellers == `subtotal − discount` (asserted).
- Discount redemption: buyer's CLAIMED row for the applied code promoted to `APPLIED`;
  unclaimed-but-valid code creates a redemption + `usedCount` increment (per-user limit enforced).

### 4. Seller / order lifecycle (M7)

| Step | Result |
| --- | --- |
| PAID → PREPARING → SHIPPED → DELIVERED (as ADMIN on shop orders tab) | ✅ |
| Tracking events appended at each transition; invalid transitions rejected server-side | ✅ |
| DELIVERED marks artworks with `stock ≤ qty` as `SOLD` | ✅ |
| **ADMIN shop-orders gap fixed**: `artisanOrders` now loads for ADMIN (all active orders) — previously only for ARTISAN, so the admin saw an empty «مرسولات جاری» tab | ✅ |
| **CANCELLED after PAID**: stock restored (`0→1`), ledger reversal entries created (SALE −X / COMMISSION +X), balance nets to zero | ✅ |

### 5. Artisan journey

Login → dashboard; artworks manager: create (image-library picker), **save draft** (2→3),
**edit** (price change), **submit for review** (PENDING 2→3); finance view with honest
demo labels; settlement request **rejected when above available balance** (server-side
ledger math, Persian error with the exact figure) then accepted for a valid amount.

### 6. Admin journey

Member-request approve (user.verified=true + planId); artwork moderation lab pipeline
QUEUED→IN_LAB→TESTS_DONE→ISSUED with authenticity record updated; publish → artwork live
in storefront + authenticity lookup returns VERIFIED; unknown code `RSH-99999` → honest
NOT_FOUND wording; support inbox mark-handled; settlement APPROVE→PAID (demo, labeled);
audit log; discount campaign/code management intact.

### 7. Authenticity lookup (M10)

- `RSH-36598` (freshly issued) → VERIFIED record with stored data; `RSH-99999` → NOT_FOUND.
- Wording updated everywhere (server messages + UI): the result is **a lookup of records
  maintained inside Risheh** — not an independent lab/certification authority. Header,
  result banner, guide list and certificate header all say so explicitly; the fake
  «REPUBLIC OF IRAN HERITAGE ARCHIVE» / «اتحادیه صنایع دستی» claims were removed; the
  hardcoded «ممتاز A+» grade now shows the record's real lab status.

### 8. Responsive (M9)

`scrollWidth − clientWidth == 0` (no horizontal overflow) on home/categories/product/cart/
verify/login/blog at **360, 375, 390, 430, 768, 1024, 1280, 1536 px**. Visual check of
390px screenshots (home, verify) and 1280px desktop. Fixed the only squeeze found (verify
search-box footer chips now wrap).

### 9. PWA & health

`/manifest.webmanifest`, `/sw.js`, `/offline.html` all 200; `/api/health` returns
`{"ok":true}`. Note for local rebuild loops: after a rebuild the browser may hold stale
server-action IDs until reload (dev-loop artifact, not a product bug).

### 10. Deployment

The live Vercel URL (risheh-store.vercel.app) was fetched and serves the Persian homepage.
It runs the **pre-fix** build until these changes are committed/pushed (Vercel build runs
`prisma migrate deploy`, which will apply the new additive migration
`20261127175458_order_discount_code` automatically).

---

## Historical session (2026-08-09)

## 1. Static checks

| Check | Command | Result |
| --- | --- | --- |
| ESLint (next/core-web-vitals + next/typescript + React Compiler rules) | `bun run lint` | ✅ **0 errors** (16 auto-fixed cosmetic warnings) |
| TypeScript compile | dev server compile (tsc via next) | ✅ compiles clean (`✓ Compiled`) |
| Production build | `bun run build` | ⚠️ **Not run** — the sandbox auto-dev-server forbids a second build on the same port (`next build` standalone conflicts with the running dev process). Must be run before real deployment (see HANDOFF). |

## 2. Browser E2E verification (agent-browser, desktop 1440×900 + mobile 390×844)

| # | Journey | Result |
| --- | --- | --- |
| 1 | Home renders: hero, 8 category tiles, 5 featured products, trust badges, footer | ✅ verified visually |
| 2 | Product detail (`#/product/<id>`): gallery switch, badges, price + discount, specs, size/color/qty selectors, guarantees, tabs (story/specs/reviews/FAQ), authenticity record | ✅ |
| 3 | Add to cart → cart view: variant chips, qty controls (stock-capped), remove, invoice summary | ✅ |
| 4 | Checkout: address validation (Zod errors surfaced in Persian toasts), shipping method prices reflected in summary | ✅ |
| 5 | Order creation: server recomputes totals; **stock exhaustion correctly rejects** («موجودی … کافی نیست؛ تنها ۰ نسخه باقی است») | ✅ |
| 6 | Demo gateway: honest labeling; **SUCCESS path** → order PAID, ref number, stock decrement, ledger entries (SALE + 10% COMMISSION), cart cleared, result view with Persian status | ✅ |
| 7 | Demo gateway: failure/cancel buttons present and wired to server outcomes (idempotent authority — second verify rejected «این تراکنش قبلاً نهایی شده است») | ✅ (success path exercised fully; fail/cancel verified at action level) |
| 8 | Login: demo account quick-fill, role selector, artisan login → dashboard | ✅ |
| 9 | Artisan dashboard: real stats from ledger, orders table, quick links, support panel | ✅ |
| 10 | Admin: stats, member-request **approve** → user.verified=true + planId set + AuditLog row | ✅ |
| 11 | Public authenticity verification `RSH-9834` → certificate with real record data + lab report | ✅ |
| 12 | All views smoke-tested (blog, about, contact, artworks, finance, lab, orders, favorites, categories) | ✅ all render with data |
| 13 | Mobile (390×844): hamburger drawer, stacked hero, 2-col grids | ✅ verified visually |
| 14 | RTL/Persian numerals/dates across views (`faNum`, `faDate`) | ✅ |
| 15 | Hydration: fixed nested-`<button>` in BlogView; console clean after fix | ✅ |

## 3. Server-side verifications (SQLite inspected directly)

- 6 orders PAID with ref numbers; each decremented stock and wrote 2 ledger rows.
- Guest cart cleared after successful payment; buyer (seeded) cart untouched.
- Member approval: `MemberRequest.status=APPROVED`, `user.verified=true`,
  `user.planId=silver`, `AuditLog: MEMBER_APPROVED`.

## 4. Not covered / known gaps

- **No automated unit/integration tests** (no vitest/jest configured) — the sandbox
  build forbids a second build/test runner port; adding Vitest is the top next step.
- **No Playwright suite** committed; the E2E above was executed manually via
  agent-browser (commands + outcomes recorded here and in PROGRESS.md).
- Fail/cancel payment paths verified at the action level, not full browser journeys.
- Accessibility: keyboard navigation, focus states, labels and semantic landmarks are
  implemented, but no axe/screen-reader audit has been run.
- Performance: images are unoptimized JPEGs from the source archive (200 files,
  ~30 MB) — production should move to next/image + CDN resizing.
- SEO: metadata/OG set in `layout.tsx`; no sitemap/robots (single-route sandbox).

## 5. How to re-run the E2E checks

```bash
agent-browser set viewport 1440 900
agent-browser open http://localhost:3000/
agent-browser snapshot -i          # interactive elements with @refs
agent-browser click @e19           # add to cart
agent-browser open "http://localhost:3000/#/cart"
agent-browser find role button click --name "ادامه فرآیند و پرداخت امن بانکی"
agent-browser find role button click --name "تایید و پرداخت (نمایشی)"
```
DB assertions:
```bash
bun -e "const {PrismaClient}=require('@prisma/client');const db=new PrismaClient();
(async()=>{console.log(await db.order.findMany({orderBy:{createdAt:'desc'},take:3}));
await db.\$disconnect();})();"
```
