# ریشه — Risheh | Persian Crafts Marketplace

Persian-first, RTL marketplace for authentic Iranian art and handicrafts:
storefront, discovery, cart & checkout, demo payments, seller workshops,
authenticity laboratory, public verification, finance/settlements and an
operations admin — rebuilt from the original "Persian Luxury Heritage" design.

> **Status: demo/development build.** Payments, SMS/OTP, email and bank
> settlements are **simulated and clearly labeled in the UI**. No real money,
> identity verification or shipping-provider integration is configured yet.
> See `docs/SECURITY.md` and `docs/DEPLOYMENT.md`.

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router), TypeScript strict |
| UI | Tailwind CSS 4 + shadcn/ui, Material Symbols (ligature font), Vazirmatn (self-hosted) |
| Data | Prisma ORM + SQLite (`db/custom.db`) |
| State | Server Components + Server Actions (no client state library needed) |
| Auth | Demo adapter — scrypt password hashing, httpOnly session cookie, server-side session store |
| Routing | Single page (`/`) with hash-based view router (sandbox preview constraint) |

## Quick start

```bash
bun install         # install dependencies
bun run db:push     # create/update the SQLite schema
bun prisma/seed.ts  # load demo data (categories, artworks, posts, users, orders)
bun run dev         # start dev server on http://localhost:3000
bun run lint        # ESLint (0 errors expected)
```

Demo accounts (password for all: `risheh1403`):

- Buyer: `buyer@risheh.ir`
- Artisan: `artisan@risheh.ir`
- Admin: `admin@risheh.ir`

## What works (demo mode)

- **Storefront:** home, categories with search/sort/filter, product detail with
  gallery, size/color variants, specs, reviews, authenticity record.
- **Cart & checkout:** server-side cart (guest or logged-in), address form,
  shipping methods with real price differences, server-verified totals and stock.
- **Payments:** clearly-labeled simulated gateway (success / failure / cancel paths);
  the result is produced only by the server-side demo adapter against a
  server-issued authority. Successful payment decrements stock, writes the seller
  ledger and clears the cart.
- **Orders:** buyer order history + tracking timeline; seller fulfilment with
  validated status transitions (PAID→PREPARING→SHIPPED→DELIVERED).
- **Seller (artisan):** artwork CRUD with ownership checks, publish/review states,
  curated image library, lab requests, financial ledger, settlement requests.
- **Authenticity:** lab workflow (admin) + public verification by hologram/artwork
  code with verified / pending / not-found states (missing code ≠ counterfeit).
- **Admin:** artisan membership approvals, subscription plans, transactions,
  artwork verification & lab queue, settlements, support messages, audit log —
  all server-authorized.

## Documentation map

| Doc | Purpose |
| --- | --- |
| `CLAUDE.md` | entry point for any continuation session |
| `docs/PROJECT_AUDIT.md` | source archive inventory → final routes |
| `docs/DESIGN_SYSTEM.md` | preserved visual tokens and rules |
| `docs/ARCHITECTURE.md` | stack, structure, data flow, routing decision |
| `docs/DATA_MODEL.md` | Prisma schema and relationships |
| `docs/SECURITY.md` | auth, authorization, validation, demo boundaries |
| `docs/TESTING.md` | what was verified, how, and what is not covered |
| `docs/DEPLOYMENT.md` | environment variables, provider configuration, Vercel notes |
| `docs/IMPLEMENTATION_PLAN.md` | phase plan & acceptance criteria |
| `docs/PROGRESS.md` | current phase status and command results |
| `docs/HANDOFF.md` | exact next steps for a continuation session |
| `docs/DECISIONS.md` | technical/product decisions and reasons |
| `docs/CHANGELOG.md` | meaningful changes by phase |
| `docs/skill/` | skill sources, licenses and installation notes |
| `docs/reference/` | original contract documents (read-only) |

## Project layout

```
src/
├── app/            # layout.tsx (fa/RTL), page.tsx (server data), globals.css (design tokens)
├── components/
│   ├── layout/     # SiteHeader, SiteFooter (faithful to original markup)
│   ├── storefront/ # ProductCard, RatingStars, StatusPill, SectionHeader
│   └── icons.tsx   # Material Symbols wrapper
├── lib/
│   ├── actions/    # Server Actions: auth, cart, orders, artworks, admin, public
│   ├── data.ts     # loadAppData() — all server data for the SPA shell
│   ├── fa.ts       # Persian numerals, dates, status labels
│   ├── session.ts  # demo auth adapter (scrypt + httpOnly cookie + session store)
│   └── db.ts       # Prisma client
└── risheh/
    ├── RishehApp.tsx  # SPA shell (header/footer + view switch)
    ├── router.ts      # hash router
    └── views/         # 17 views: home, categories, product, cart, payment, verify,
                       # login, about, blog, contact, dashboard, artworks, orders,
                       # finance, lab, admin, favorites
prisma/
├── schema.prisma  # 20 models
└── seed.ts        # demo data extracted from the original pages
public/assets/     # curated images (120) + Vazirmatn & Material Symbols fonts
risheh-source/     # extracted original archive + audit references (not served)
```

## Mobile web app (PWA)

Risheh is installable on phones: open the site in Chrome (Android) and tap **نصب**, or in
Safari (iOS) use Share → **Add to Home Screen**. In production (`bun run build && bun run start`)
the service worker enables the offline page and faster repeat loads. In dev the worker is
disabled on purpose. Test installability with Chrome DevTools → Application → Manifest.

