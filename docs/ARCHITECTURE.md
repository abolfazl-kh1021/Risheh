# ARCHITECTURE.md

## 1. Stack decision

**Next.js 16 (App Router) + TypeScript strict + Tailwind CSS 4 + Prisma/PostgreSQL (Neon).**

Reasons (see `DECISIONS.md` D1 for alternatives):
- The project contract prefers Next.js App Router unless the audit says otherwise.
- Server Components + Server Actions give server-side authorization and totals
  without a separate API layer.
- Tailwind 4 `@theme` lets the original source class names (`bg-primary-container`,
  `text-on-surface-variant`, `gap-space-md`, …) work verbatim, which is the single
  biggest enabler of design fidelity.
- PostgreSQL (Neon) via Prisma is the persistence layer for Vercel deployment; for local dev a Postgres 16 instance (docker-compose) or any Postgres works. The schema was migrated from SQLite
  Postgres for production.

## 2. The single-route SPA decision (important)

The sandbox preview exposes **only `/`**. The whole application therefore lives in
one route with a **hash-based view router** (`src/risheh/router.ts`):

- URLs: `#/home`, `#/categories/:slug`, `#/product/:id`, `#/cart`, `#/payment/:orderNumber`,
  `#/login`, `#/verify`, `#/about`, `#/blog`, `#/contact`, `#/dashboard`, `#/artworks`,
  `#/orders`, `#/finance`, `#/lab`, `#/admin`, `#/favorites`.
- Back/forward and shareable links work; scroll resets on navigation.
- **Next.js URL-sync fix:** Next's App Router tracks its own URL and `router.refresh()`
  rewrites the address bar to the last URL *it* observed, which would clobber hash
  routing. `useRouter()` therefore keeps Next's tracked URL in sync via
  `window.history.replaceState(...)` on every hash change (`src/risheh/router.ts`).
  Do not remove this.

For a real multi-route deployment, each view maps 1:1 to a route
(`app/(storefront)/product/[id]/page.tsx`, …) — views are already isolated components
receiving `data` + callbacks, so the move is mechanical (documented in HANDOFF.md).

## 3. Data flow

```
page.tsx (Server Component)
  └─ loadAppData()                     # src/lib/data.ts — one query pass
      ├─ session user                  # src/lib/session.ts (cookie → DB session)
      ├─ categories + published artworks (+sellers, authenticity, reviews)
      ├─ blog posts, cart (user or guestKey)
      ├─ buyer: orders, favorites
      ├─ artisan: own artworks, fulfilment orders, ledger, settlements, lab requests, plan
      └─ admin: member requests, plans, transactions, audit, messages, lab queue, stats
  └─ <RishehApp data={...}/>           # serialized DTOs (src/lib/types.ts)

Client (RishehApp)
  └─ view switch by hash → 17 view components
  └─ mutations via Server Actions ("use server" in src/lib/actions/*)
        └─ revalidatePath("/") + router.refresh() → server re-render
```

## 4. Module boundaries

| Layer | Location | Rule |
| --- | --- | --- |
| Views (presentation) | `src/risheh/views/*` | No direct DB access; props in, actions out |
| Shared UI | `src/components/*` | Reusable, data-agnostic |
| Server Actions | `src/lib/actions/*` | Zod validation, `getCurrentUser()`, ownership/role checks, rate limiting, `revalidatePath` |
| Data access | `src/lib/data.ts`, `db` | Only server side |
| Formatting | `src/lib/fa.ts` | Persian numerals/dates/labels |
| Session/auth | `src/lib/session.ts` | scrypt hashing, signed cookie, DB sessions, guest cart key, in-memory rate limiter |
| Domain types | `src/lib/types.ts` | DTO contract between server and views |

## 5. Key flows

### Checkout & demo payment (no fake success)
1. `createOrderAction` — validates address (Zod), recomputes subtotal from DB prices,
   checks stock, creates Order (PENDING_PAYMENT) + items + PaymentAttempt (PENDING)
   with a **server-issued authority**.
2. Gateway view (`#/payment`) — labeled simulator; user picks success/failure/cancel.
3. `verifyDemoPaymentAction` — verifies the authority server-side (status PENDING →
   idempotent), sets payment status, on SUCCESS: decrements stock, writes
   SALE/COMMISSION ledger entries, sets order PAID, tracking event, clears the cart.
   The client never supplies amounts or statuses.
4. Result view renders from DB (`data.myOrders`) for signed-in buyers or from the
   server-verified action response held in memory for guests.

### Authenticity verification
`verifyAuthenticityAction` looks up `AuthenticityRecord` by hologram/artwork code.
States: VERIFIED (certificate + tests), PENDING (in lab), NOT_FOUND — with the honest
wording "کد نیافتن به معنای تقلبی بودن اثر نیست".

### Admin operations
Every `src/lib/actions/admin.ts` function starts with `requireAdmin()`. Approvals
update the DB, write `VerificationEvent`/`AuditLog` rows, and `revalidatePath`.

## 6. Styling architecture

- `src/app/globals.css`: shadcn semantic vars mapped onto the M3 palette + full
  token tables (see `DESIGN_SYSTEM.md`).
- Fonts self-hosted in `public/assets/fonts/` (Vazirmatn variable + Material Symbols).
- Images in `public/assets/img/` (120 curated files, all downloaded local).

## 7. Testing infrastructure

- `bun run lint` (ESLint, next/core-web-vitals + next/typescript, React Compiler rules).
- Browser E2E verification performed with agent-browser (see `TESTING.md`).
- Unit test runner is not configured (no vitest) — documented gap in TESTING.md.
