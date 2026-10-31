# DECISIONS.md

| # | Decision | Alternatives considered | Reason |
| --- | --- | --- | --- |
| D1 | **Next.js 16 App Router + TS + Tailwind 4 + Prisma/SQLite** (per skill/contract default) | Vite+React SPA; plain HTML restoration | Contract's preferred default; Server Actions give server-side auth/totals without an API layer; Tailwind 4 `@theme` lets the original class names (`bg-primary-container`, `gap-space-md`) work verbatim — the key to design fidelity. SQLite is the only sandbox-supported Prisma provider. |
| D2 | **Single-route hash-routed SPA** (`#/view/param`) | Multi-route `app/` pages | The sandbox preview exposes only `/` (hard environment constraint). Views are isolated components so a 1:1 route split is mechanical later. Hash URLs keep deep links + browser back working. |
| D3 | **Two palettes preserved side-by-side** (brand palette on home, M3 elsewhere) | Unify to one palette | The source itself has two variants (index.html vs 15 M3 pages). Preserving both is maximally faithful; tokens registered separately (`brand-*`, M3 names). |
| D4 | **Server Actions for all mutations** (no REST/GraphQL layer) | `/api/*` route handlers | Typesafe, co-located authorization, no client fetch boilerplate; Next-native. API routes would be added when a mobile client appears. |
| D5 | **Demo auth adapter** (scrypt + httpOnly cookie + DB sessions) instead of NextAuth | NextAuth v4; real OTP | No external provider is configured in the sandbox; the adapter is small, honest, and labeled demo; scrypt+timingSafeEqual is cryptographically sound. NextAuth remains a drop-in upgrade path. |
| D6 | **Demo payment gateway** with server-issued authority + server-side verification | Real gateway (no credentials); client-side "success" page | Contract forbids faking success AND forbids client-redirect-as-proof. The simulator keeps the correct server trust chain (create → authority → server verify → ledger) so swapping in Zarinpal/Mellat later changes one module. UI labels simulation explicitly. |
| D7 | **SameSite=Lax cookies, no explicit CSRF token layer** | Double-submit CSRF tokens | Server Actions validate SameSite/Origin natively in Next.js; all mutations are POSTs via actions. A token layer can be added for paranoia, documented in SECURITY.md. |
| D8 | **Curated image library instead of uploads** | Vercel Blob/S3 integration | No storage provider in sandbox; contract requires safe upload validation before enabling uploads. Paths are whitelist-checked server-side (`/assets/img/…`). |
| D9 | **OTP login tab rendered but disabled with honest notice** | Hide the tab; fake an OTP | The contract demands visible controls either work or explain unavailability. Faking an OTP would violate the no-fake rule. |
| D10 | **`history.replaceState` sync inside the hash router** | Call `router.refresh()` only (accept URL clobber); custom Next middleware | Next's App Router rewrites the address bar to its last-tracked URL on `router.refresh()`, silently breaking hash routing (discovered via E2E). Syncing via replaceState is the documented Next-supported mechanism for external history updates. |
| D11 | **All content in Persian; docs in English** | Persian docs | Product is Persian-first (contract); developer docs follow the guide's English rule. |
| D12 | **Seed content extracted verbatim from the archive** (catalog.json, page text refs) | Invented placeholder products | Fidelity + the source contained a full 8×6 catalog with real Persian copy; marked as demo/sample data in UI-facing contexts where amounts matter (finance/ledger notes). |
| D13 | **Guest carts via `guestKey` cookie; carts cleared only on payment SUCCESS** | Login-required carts; clear cart at order creation | Guests must be able to buy in the demo; clearing on failure/cancel preserves the buyer's cart for retry (matches the source's retry affordance). |
| D14 | **Commission model: 10% platform commission written to ledger at payment time** | Subscription-only revenue; configurable commission | Matches the source dashboard copy («کارمزد تضمین اصالت و بیمه: ۱۰٪») and gives the finance view real derivable balances. Config extraction into settings is a future enhancement. |

## Unresolved questions for the product owner

1. Real gateway choice (Zarinpal / Mellat / Zibal / …) and its settlement cadence.
2. Commission percentage policy (10% hard-coded to match source copy).
3. Whether artisan memberships (admin module) should gate artwork publishing.
4. Shipping providers (post/Tipax/courier) and whether tracking numbers will be
   provider-fed (currently status timeline is operational, no fabricated codes).
5. Domain name for production (footer uses placeholder address/phone/email).

## D-PWA — Installable mobile web app (PWA) inside the same Next.js app

**Decision:** deliver the "mobile app" as a Progressive Web App on top of the existing
single-route SPA, not as a separate codebase.
**Why:** one source of truth for data, auth and Server Actions; the design language stays
identical (tokens in `globals.css`); installable from the browser, no store review.
**What:** `public/manifest.webmanifest`, `public/sw.js` (+ `offline.html`), icons in
`public/assets/icons/`, `PwaProvider` (SW registration prod-only, install prompt, offline
banner), `MobileTabBar` (bottom nav below `md`).
**Safety rule:** the service worker never caches HTML, RSC payloads, `/api/*` or Server
Actions (they carry session/cart data). Only static fonts, images, icons and `/_next/static`.

