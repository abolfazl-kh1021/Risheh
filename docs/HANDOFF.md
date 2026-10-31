# HANDOFF.md — continue from here

New session? Read `CLAUDE.md` first, then `PROGRESS.md`, then this file, then inspect
the code paths named below. Do not restart completed work.

## 1. State snapshot

- Phases 0–8 done (audit → foundation → storefront → auth → seller → cart/payment →
  authenticity/finance → admin → quality pass). Phase 9 (GitHub/Vercel) documented,
  not executed. Phase 10 docs written.
- Working app: Next.js 16 dev server on :3000, Prisma/SQLite seeded, lint clean.
- Known-constraint: sandbox exposes only `/` → the app is a hash-routed SPA.

## 2. Exact next actions (in order)

### A. Production build (do first)
```bash
cd /home/z/my-project
bun run build        # must pass outside the auto-dev sandbox; fix anything surfaced
bun run lint         # keep 0 errors
```
Expected outcome: `.next/` production build succeeds. If `next build` warns about
client components using server imports, check `src/lib/actions/*` (`"use server"` at
top) and `src/lib/db.ts` usage stays server-side.

### B. GitHub + Vercel (user account actions — never fabricate URLs)
Follow `docs/DEPLOYMENT.md` §2 verbatim (git init → push; Vercel import; env vars
`AUTH_SECRET` + `DATABASE_URL`; smoke-test deployed routes). Record the real URLs in
this file afterwards.

### C. Optional hardening (prioritized)
1. Route split for SEO: convert `src/risheh/views/*` to `app/**/page.tsx` routes
   (components are already isolated; the shared shell moves to `app/layout.tsx`;
   keep `RishehApp` only as a transition shim or delete it after split).
2. Tests: add Vitest for `src/lib/fa.ts`, actions validation logic, and the order
   transition map; add Playwright for checkout + verify journeys (scripts exist in
   TESTING.md §5).
3. DB: move to Postgres (`DATABASE_URL`), add migrations (`prisma migrate dev`),
   replace `db:push` in scripts.
4. Replace the demo payment adapter with a real gateway (server-to-server verify) —
   keep the demo adapter behind an env flag until then.

## 3. Files to inspect for each task

| Task | Files |
| --- | --- |
| Any UI change | `src/risheh/views/*`, `src/components/**`, design contract `docs/DESIGN_SYSTEM.md` |
| Data/business logic | `src/lib/actions/*` (all mutations), `src/lib/data.ts` (read pass), `prisma/schema.prisma` |
| Auth/session | `src/lib/session.ts` (scrypt, cookies, guest key, rate limiter) |
| Payment flow | `src/lib/actions/orders.ts` (create/verify/transition), `src/risheh/views/PaymentView.tsx`, `src/risheh/views/CartView.tsx` |
| Hash routing / Next sync | `src/risheh/router.ts` (critical: `history.replaceState` sync — do not remove) |
| Seed/demo data | `prisma/seed.ts`, `risheh-source/refs/catalog.json` + `asset_map.json` |
| Tokens/styles | `src/app/globals.css` |

## 4. Demo credentials (seeded)

`buyer@risheh.ir` / `artisan@risheh.ir` / `admin@risheh.ir` — password `risheh1403`
(shown in the login UI, labeled demo). Reset data with `bun prisma/seed.ts`.

## 5. Environment variables

See `.env.example`. Currently used: `DATABASE_URL`, `AUTH_SECRET` (optional in demo —
a documented fallback exists; REQUIRED in production).

## 6. Known bugs / limitations

- OTP login tab intentionally disabled (no SMS provider) with honest notice.
- Uploads limited to the curated local image library (no storage provider).
- Newsletter/contact only store data; no outbound email (responses state this).
- `risheh-source/` (extracted archive + refs) is dev material, git-ignored.
- Unit tests not configured; production build not yet run (env constraint).
- Mobile drawer focus trap not implemented (Escape/backdrop close work).

## 7. Decisions you must not silently change

- Two-palette design fidelity (brand palette on home, M3 elsewhere) — see DECISIONS.md D3.
- Demo labeling wording («شبیه‌سازی — پول واقعی جابه‌جا نمی‌شود») — required by the contract.
- Server-side authorization and totals — never move to the client.
- Hash router URL sync hack — removing it reintroduces the refresh-clobber bug.
