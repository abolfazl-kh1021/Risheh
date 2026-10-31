# PROGRESS.md — current status

**Last updated:** performance pass (2026-11-09, Asia/Tehran).
**Current phase:** Phases 0–8 complete; **performance pass (v0.9.0) complete** —
images −58%, icon font −97%, logo splash, code splitting, RUM, DB indexes,
responsive verified 360–1536px (see `docs/PERFORMANCE.md`). Phase 9 (GitHub/Vercel)
prepared, pending user actions.

## Completed (with evidence)

| Area | Work | Files |
| --- | --- | --- |
| Phase 0 audit | archive extracted; 16 pages inventoried; catalog JSON extracted from embedded React apps; image map (70 remote downloaded, 120 local total); page text references | `scripts/audit_pages.py`, `scripts/extract_refs.py`, `scripts/collect_assets.py`, `risheh-source/refs/*` |
| Foundation | design tokens (both palettes), Vazirmatn + Material Symbols self-hosted, fa/RTL layout, spacing/type scales | `src/app/globals.css`, `src/app/layout.tsx` |
| Data layer | 20-model Prisma schema pushed; seed with verbatim source content (58 artworks, 8 categories, 7 posts, 4 plans, demo users/orders/ledger) | `prisma/schema.prisma`, `prisma/seed.ts` |
| Server logic | 6 action modules (auth/cart/orders/artworks/admin/public) with Zod, ownership checks, rate limits, idempotent demo payment | `src/lib/actions/*` |
| UI shell | faithful header (utility bar + main bar + drawer), footer, product card, status pills, hash router with Next URL-sync fix | `src/components/layout/*`, `src/components/storefront/*`, `src/risheh/router.ts` |
| Views (17) | home, categories, product, cart, payment, verify, login, about, blog, contact, dashboard, artworks, orders, finance, lab, admin, favorites | `src/risheh/views/*` |
| Docs | CLAUDE.md, README.md, 11 docs/* files, docs/skill/*, .env.example, .gitignore | this tree |

## Commands run & results (this session)

- `bun run db:push` → ✅ schema synced (Prisma 6.19.2)
- `bun prisma/seed.ts` → ✅ seeded: users 8, categories 8, artworks 58, authenticity 58, blog 7, plans 4
- `bun run lint` → ✅ 0 errors (after fixes; auto-fixed 16 directive warnings)
- `agent-browser` E2E → ✅ home/product/cart/checkout/payment(success)/login/artisan/admin/verify/blog/about/contact/orders/finance/lab/favorites + mobile 390px
- `bun run build` → ⚠️ not run (sandbox dev server owns port 3000; forbidden by environment). Recorded in TESTING.md.

## Bugs found & fixed during verification

1. Product view `artworkId` not destructured → runtime error → fixed.
2. Guest cart variant JSON shown raw → parsed to chips; cart code display fixed.
3. Cart not cleared after successful payment → server action now clears buyer cart.
4. Payment result race (stale server data) → loading state + server-verified result in memory.
5. **Next.js App Router clobbering hash URL on `router.refresh()`** → `history.replaceState` sync in the hash router (critical fix, documented in ARCHITECTURE.md).
6. `onVerified` not destructured in PaymentView → ReferenceError → fixed (caught via console instrumentation).
7. Missing rug image in seed (local path not copied) → copied all archive images (200 total).
8. Nested `<button>` hydration error in BlogView grid → converted card to `article[role=button]`.
9. Hero rug used mismatched images → assigned correct carpet images (DB + seed).

## Test status summary

- Lint: PASS (0 errors). Types: compile PASS. Production build: NOT RUN (env constraint).
- E2E golden paths: PASS (see TESTING.md for the full table).
- Unit tests: none configured (gap recorded).

## Blockers / open items

1. `bun run build` + Vercel deploy are user-side actions (Phase 9).
2. Real providers (payment/SMS/email/uploads) absent — demo adapters labeled honestly.
3. OTP login tab is intentionally non-functional with an explanatory notice.
4. `risheh-source/` contains the extracted original archive (dev-only, git-ignored).

## Next three actions (in order)

1. Run `bun run build` locally and fix anything it surfaces (expected clean).
2. Create the GitHub repo, push (commands in `docs/DEPLOYMENT.md` §2), deploy to
   Vercel with `AUTH_SECRET` + production `DATABASE_URL`, smoke-test the deployed URL.
3. Optional upgrades: Postgres migration, Vitest/Playwright suites, route split for SEO.
