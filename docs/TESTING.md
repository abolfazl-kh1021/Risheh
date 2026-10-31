# TESTING.md

Environment: sandbox, dev server (`bun run dev`, port 3000), Chrome via agent-browser.
Recorded: 2026-08-09 session (this build).

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
