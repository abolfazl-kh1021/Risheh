# IMPLEMENTATION_PLAN.md — phases & acceptance criteria

Contract: `docs/reference/RISHEH_PROJECT_GUIDE.md` §11. Status column maintained in
`docs/PROGRESS.md`.

| Phase | Goal | Acceptance criteria | Status |
| --- | --- | --- | --- |
| 0 | Audit + bootstrap | every source page inventoried & mapped; design tokens extracted; docs + `docs/skill/` created; runnable scaffold; no legacy pages in production tree | ✅ done |
| 1 | Foundation & design system | tokens registered in Tailwind 4; Vazirmatn + Material Symbols self-hosted; shared header/footer/drawer faithful to source; RTL + responsive shell; loading/error/empty patterns | ✅ done |
| 2 | Public storefront & discovery | home (brand variant), categories with working search/sort/filter, product detail (gallery/variants/tabs/reviews/authenticity), blog, about, contact — all links & controls functional | ✅ done |
| 3 | Auth & user account | register/login/logout with scrypt + httpOnly sessions; protected dashboard views; demo accounts clearly labeled; unauthorized states | ✅ done |
| 4 | Seller artwork management | artwork CRUD with server-side ownership checks; draft/pending/published states; curated image library (uploads documented as pending provider) | ✅ done |
| 5 | Cart, checkout, payment, orders | server-side totals & stock; duplicate/idempotent payment handling; labeled demo gateway with success/fail/cancel; buyer order history + seller fulfilment with validated transitions | ✅ done |
| 6 | Authenticity & finance | public verification (verified/pending/not-found) from trusted records; lab requests; ledger + settlements with balance checks; audit trail | ✅ done |
| 7 | Admin & operations | server-enforced ADMIN for every privileged action; membership approvals; artwork verification & lab queue; settlements; support inbox; audit log | ✅ done |
| 8 | Quality, security, SEO, performance | lint 0 errors; browser E2E golden paths verified; RTL + mobile checks; hydration bugs fixed; security review written; SEO metadata set; gaps recorded honestly | ✅ done (with recorded gaps: unit tests, production build, axe audit) |
| 9 | GitHub & Vercel | clean repo (no secrets), build verified, deployment performed & smoke-tested | ⏳ prepared — manual steps in DEPLOYMENT.md; `bun run build` must be run outside the sandbox |
| 10 | Final handoff | docs current; features classified real/demo/partial; next steps explicit | ✅ this set of docs |

## Definition of Done scorecard (from the guide §14)

- [x] Every source page has a final view or documented exclusion (`PROJECT_AUDIT.md`).
- [x] Original visual identity preserved and checked at desktop + mobile.
- [x] Persian RTL behavior correct (layout direction, numerals, dates, mixed-script).
- [x] All navigation and visible controls work or explain unavailability honestly.
- [x] Forms validate with accessible Persian feedback.
- [x] Auth + protected routes implemented safely; demo-only clearly labeled.
- [x] Seller ownership + admin permissions enforced server-side.
- [x] Cart/order totals validated server-side.
- [x] Payment success provider-verified **or clearly simulated** → simulated, labeled.
- [x] Authenticity results backed by trusted records.
- [x] Financial figures derived from ledger or clearly demo-labeled.
- [x] No critical console errors or broken assets (fixed during verification).
- [x] Lint passes; production build recorded as pending (environment constraint).
- [x] Accessibility/responsive checks recorded.
- [x] SEO metadata configured; sitemap/robots pending route split.
- [x] Secrets absent from repo; `.env.example` complete.
- [x] `docs/skill/` truthful manifest.
- [ ] GitHub push + Vercel deploy performed (user action — Phase 9).
- [x] `PROGRESS.md`, `HANDOFF.md`, `CHANGELOG.md`, README current.
- [x] A new session can continue from repository documents alone.
