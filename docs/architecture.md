# Risheh (ریشه) — Architecture

Documentation for the bilingual art & handicraft marketplace.

**Stack:** Next.js App Router, TypeScript, Tailwind 4, shadcn/ui, PostgreSQL, Prisma, next-intl (URL-based /fa and /en), next-themes, Auth.js, Zod
**Roles:** customer / artist / admin
**Locales:** Persian (`fa`, RTL) and English (`en`, LTR)

---

## 1. Page and Route Map

The locale appears as the **first URL path segment**: `/fa/...` and `/en/...`.

- The root path `/` redirects to the user's preferred locale (Persian default unless overridden by cookie / `Accept-Language`).
- Locale preference is persisted in a cookie and `localStorage` and survives navigation and page reloads.
- Example: `/fa/product/oil-painting-1`, `/en/product/oil-painting-1`, `/fa/seller/dashboard`, `/en/seller/dashboard`.

| Route | Access | Role | Notes |
|-------|--------|------|-------|
| `/` | Public | all | Redirects to localized homepage |
| `/[locale]/` | Public | all | Homepage: hero, search, categories, featured products, new arrivals, collections, artist spotlights |
| `/[locale]/marketplace` | Public | all | Product grid with search, filters, sorting, pagination |
| `/[locale]/category/[slug]` | Public | all | Dedicated category page (paintings, calligraphy, ceramics, carpets, etc.) |
| `/[locale]/product/[slug]` | Public | all | Product detail: gallery, price, stock, materials, dimensions, techniques, story, artist info, reviews, related products, add-to-cart, wishlist |
| `/[locale]/artist/[slug]` | Public | all | Artist profile: photography, biography, style, experience, collections |
| `/[locale]/collections/[slug]` | Public | all | Curated collection page |
| `/[locale]/articles/[slug]` | Public | all | Blog / stories behind the artworks |
| `/[locale]/cart` | Public | all | Guest cart via cookie/localStorage; merges with user cart on login |
| `/[locale]/checkout` | Protected | customer | Order placement and payment |
| `/[locale]/orders/[id]` | Protected | customer | Order tracking |
| `/[locale]/account` | Protected | customer | Profile, addresses, order history |
| `/[locale]/login` | Public | all | Redirects if already authenticated |
| `/[locale]/register` | Public | all | Redirects if already authenticated |
| `/[locale]/seller/dashboard` | Protected | artist | Product CRUD, own orders, earnings |
| `/[locale]/seller/products/[id]/edit` | Protected | artist | Edit own products |
| `/[locale]/admin/dashboard` | Protected | admin | Users, artists, products, categories, orders, content review |
| `/[locale]/admin/orders` | Protected | admin | Order management |
| `/[locale]/admin/products` | Protected | admin | Product moderation |
| `/[locale]/admin/users` | Protected | admin | User management |
| `/[locale]/admin/reviews` | Protected | admin | Review approval |
| `/[locale]/help` | Public | all | Help center / FAQs |
| `/[locale]/contact` | Public | all | Contact Us |
| `/[locale]/terms` | Public | all | Terms and Conditions |
| `/[locale]/privacy` | Public | all | Privacy Policy |
| `/[locale]/shipping` | Public | all | Shipping policy |
| `/[locale]/returns` | Public | all | Returns policy |

> 404/500 handled by `not-found.tsx` and `error.tsx` (no explicit routes).

**Access rules:**

- **Public:** browsable by anyone, including unauthenticated users.
- **Protected:** requires a valid session; unauthenticated users are redirected to `/[locale]/login`.
- Role enforcement is applied server-side in middleware and in Route Handlers / Server Actions:
  - Customer-only routes: checkout, orders, account.
  - Artist-only routes: seller dashboard, product edit.
  - Admin-only routes: `/admin/*`.

---

## 2. Database Design (Prisma)

The block below is **documentation only**. Do not create a real `schema.prisma` file from this; it describes the intended domain model.

```prisma
// DOCUMENTATION ONLY — not a real schema.prisma file

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  passwordHash  String?
  role          Role      @default(CUSTOMER)
  name          String
  phone         String?
  avatar        String?
  emailVerified DateTime?
  createdAt     DateTime  @default(now())

  artistProfile ArtistProfile?
  orders        Order[]
  reviews       Review[]
  wishlist      WishlistItem[]
  articles      Article[]
  carts         Cart[]
  addresses     Address[]
}

model ArtistProfile {
  id           String   @id @default(uuid())
  userId       String   @unique
  user         User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  bio          String?
  style        String?
  experience   String?
  location     String?
  portfolioUrl String?
  isVerified   Boolean  @default(false)
  createdAt    DateTime @default(now())

  products     Product[]
}

model Category {
  id          String     @id @default(uuid())
  name        String
  slug        String     @unique
  description String?
  parentId    String?
  parent      Category?  @relation("CategoryChildren", fields: [parentId], references: [id])
  children    Category[] @relation("CategoryChildren")
  image       String?
  sortOrder   Int        @default(0)
  createdAt   DateTime   @default(now())

  products    Product[]
}

model Product {
  id           String        @id @default(uuid())
  artistId     String
  artist       ArtistProfile @relation(fields: [artistId], references: [id], onDelete: Cascade)
  categoryId   String
  category     Category      @relation(fields: [categoryId], references: [id])
  title        String
  slug         String        @unique
  description  String?
  price        Decimal
  currency     String        @default("IRR")
  stock        Int           @default(0)
  materials    String?
  dimensions   String?
  techniques   String?
  images       Json          // [{ url, alt, sortOrder }]
  status       ProductStatus @default(DRAFT)
  createdAt    DateTime      @default(now())

  orderItems   OrderItem[]
  reviews      Review[]
  wishlistedBy WishlistItem[]
  collections  CollectionProduct[]
}

enum ProductStatus {
  DRAFT
  ACTIVE
  ARCHIVED
}
model Order {
  id              String        @id @default(uuid())
  userId          String
  user            User          @relation(fields: [userId], references: [id])
  status          OrderStatus   @default(PENDING)
  total           Decimal
  shippingAddress Json
  paymentStatus   PaymentStatus @default(PENDING)
  createdAt       DateTime      @default(now())

  items           OrderItem[]
  transactions    PaymentTransaction[]
}

enum OrderStatus {
  PENDING
  CONFIRMED
  SHIPPED
  DELIVERED
  CANCELLED
  REFUNDED
}

enum PaymentStatus {
  PENDING
  PAID
  FAILED
  REFUNDED
}

model OrderItem {
  id        String   @id @default(uuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal
  snapshot  Json     // product data at time of purchase
}

model Review {
  id         String   @id @default(uuid())
  productId  String
  product    Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  rating     Int
  comment    String?
  isApproved Boolean  @default(false)
  createdAt  DateTime @default(now())
}

model WishlistItem {
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())

  @@id([userId, productId])
}

model Collection {
  id          String   @id @default(uuid())
  title       String
  slug        String   @unique
  description String?
  coverImage  String?
  isCurated   Boolean  @default(false)
  createdAt   DateTime @default(now())

  products    CollectionProduct[]
}

model CollectionProduct {
  collectionId String
  collection   Collection @relation(fields: [collectionId], references: [id], onDelete: Cascade)
  productId    String
  product      Product    @relation(fields: [productId], references: [id], onDelete: Cascade)
  addedAt      DateTime   @default(now())

  @@id([collectionId, productId])
}

model Article {
  id          String    @id @default(uuid())
  authorId    String
  author      User      @relation(fields: [authorId], references: [id])
  title       String
  slug        String    @unique
  body        String
  coverImage  String?
  published   Boolean   @default(false)
  publishedAt DateTime?
  createdAt   DateTime  @default(now())
}

model PaymentTransaction {
  id          String        @id @default(uuid())
  orderId     String
  order       Order         @relation(fields: [orderId], references: [id], onDelete: Cascade)
  provider    String        // e.g. "stripe", "zarinpal", "demo"
  referenceId String?
  amount      Decimal
  status      PaymentStatus
  createdAt   DateTime      @default(now())
}

model Cart {
  id        String     @id @default(uuid())
  userId    String
  user      User       @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime   @default(now())
  updatedAt DateTime   @updatedAt

  items     CartItem[]
}

model CartItem {
  id        String   @id @default(uuid())
  cartId    String
  cart      Cart     @relation(fields: [cartId], references: [id], onDelete: Cascade)
  productId String
  product   Product  @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Decimal

  @@unique([cartId, productId])
}

model Address {
  id        String   @id @default(uuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label     String?
  fullName  String
  phone     String?
  province  String?
  city      String
  street    String
  postal    String?
  createdAt DateTime @default(now())
}
```

**Relationship summary:**

- `User` ↔ `ArtistProfile`: 1:1 (an artist is a user with a linked profile).
- `Artist` → `Product`: 1:N (artist owns many products).
- `Category` → `Product`: 1:N; `Category` self-references for parent/child categories.
- `Product` ↔ `Collection`: M:N through `CollectionProduct`.
- `User` → `Order`: 1:N; `Order` → `OrderItem`: 1:N.
- `Product` → `Review`: 1:N; `User` → `Review`: 1:N.
- `User` ↔ `Product` via `WishlistItem`: M:N.
- `User` → `Article`: 1:N.
- `Order` → `PaymentTransaction`: 1:N.
- `User` → `Cart`: 1:N; `Cart` → `CartItem`: 1:N; `Product` → `CartItem`: 1:N.
- `User` → `Address`: 1:N.

---

## 3. Project Folder Structure

```
risheh/
├── app/                              # Next.js App Router
│   ├── [locale]/                     # localized routes: /fa/..., /en/...
│   │   ├── page.tsx                  # /[locale]/
│   │   ├── marketplace/page.tsx
│   │   ├── category/[slug]/page.tsx
│   │   ├── product/[slug]/page.tsx
│   │   ├── artist/[slug]/page.tsx
│   │   ├── collections/[slug]/page.tsx
│   │   ├── articles/[slug]/page.tsx
│   │   ├── cart/page.tsx
│   │   ├── checkout/page.tsx
│   │   ├── orders/[id]/page.tsx
│   │   ├── account/page.tsx
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   ├── seller/dashboard/page.tsx
│   │   ├── seller/products/[id]/edit/page.tsx
│   │   ├── admin/dashboard/page.tsx
│   │   ├── admin/orders/page.tsx
│   │   ├── admin/products/page.tsx
│   │   ├── admin/users/page.tsx
│   │   ├── admin/reviews/page.tsx
│   │   ├── help/page.tsx
│   │   ├── contact/page.tsx
│   │   ├── terms/page.tsx
│   │   ├── privacy/page.tsx
│   │   ├── shipping/page.tsx
│   │   ├── returns/page.tsx
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   └── loading.tsx
│   ├── api/                          # Route Handlers (server-only)
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── ai/search/route.ts
│   │   ├── ai/recommendations/route.ts
│   │   ├── ai/review-summary/route.ts
│   │   ├── ai/artist-assistant/route.ts
│   │   └── payments/[provider]/route.ts
│   ├── layout.tsx
│   └── template.tsx
├── middleware.ts                     # locale detection + protected-route guards (project root only)
├── components/
│   ├── ui/                           # base design system (button, input, card, modal, badge)
│   ├── marketplace/                  # product grid, filters, sorting, search bar
│   ├── products/                     # gallery, image zoom, add-to-cart, wishlist button
│   ├── seller/                       # product form, artist dashboard widgets
│   ├── admin/                        # data tables, moderation UI
│   ├── layout/                       # header, footer, breadcrumbs, locale/theme switchers
│   └── shared/
├── lib/
│   ├── prisma.ts                     # Prisma client singleton
│   ├── auth.ts                       # Auth.js configuration
│   ├── i18n.ts                       # next-intl configuration
│   ├── ai/server.ts                  # server-only AI service layer (demo mode here)
│   ├── payments/                     # gateway adapters (test/demo mode)
│   ├── cart.ts                       # cart helpers (cookie/localStorage + DB sync)
│   └── utils.ts
├── hooks/
│   ├── useCart.ts
│   ├── useTheme.ts
│   ├── useLocale.ts
│   ├── useAuth.ts
│   └── useAiSearch.ts
├── locales/
│   ├── fa.json                       # Persian translations
│   └── en.json                       # English translations
├── types/
│   └── index.ts                      # global TypeScript types
├── styles/
│   ├── globals.css                   # Tailwind directives + theme CSS variables
│   └── tailwind.css
├── public/
│   ├── fonts/                        # Vazirmatn/Estedad, Manrope/Inter, display font
│   ├── images/                       # licensed placeholder images (Unsplash/Pexels)
│   └── icons/
├── prisma/
│   └── schema.prisma                 # (created during implementation; described in §2)
├── docs/
│   ├── PROJECT_BRIEF.md
│   └── architecture.md
├── tailwind.config.ts
├── next.config.ts
├── tsconfig.json
└── .env.example
```

---

## 4. i18n and Theming

### i18n (Persian / English)

**Recommended library: next-intl.**

**Justification:** first-class support for the Next.js App Router and React Server Components, TypeScript-safe typed translations, built-in locale routing and middleware, and active maintenance. All user-visible text lives in `locales/fa.json` and `locales/en.json`; no text is hardcoded in components.

- **Locale in URLs:** first path segment (`/fa/...`, `/en/...`). Example: `/fa/product/oil-painting-1`.
- **Locale detection order:** URL segment → cookie → `localStorage` → `Accept-Language` header → default (`fa`).
- **Persistence:** selected locale is stored in a cookie (read by middleware) and mirrored in `localStorage` (read on client hydration) to avoid layout shift on reload.
- **Formatting:** dates, numbers, and prices are formatted per locale (Persian numerals available for `fa`).
- **Middleware:** rewrites `/` to the localized path and sets the `next-intl` locale cookie.

### RTL / LTR

- `<html dir="rtl" lang="fa">` for Persian; `<html dir="ltr" lang="en">` for English.
- Tailwind logical properties (`padding-inline-start`, `margin-inline-end`, `text-align: start/end`, etc.) so spacing and alignment flip automatically with direction.
- Icons, component order, and button placement adapt to the selected language direction.

### Theming (Light / Dark)

**Recommended library: next-themes.**

**Justification:** lightweight, persists theme in `localStorage` plus a cookie to prevent flash-of-wrong-theme, supports a `system` preference, and uses a class-based dark strategy (`class="dark"` on `<html>`) that integrates cleanly with Tailwind's `dark:` variants.

- **Light mode:** warm cream/ivory backgrounds, deep forest green primary, terracotta accents, muted gold details.
- **Dark mode:** independent, sophisticated palette — charcoal or very dark green; not a simple inversion of light mode.
- **Persistence:** theme preference stored in `localStorage` and a cookie, applied before hydration.
- **Typography:** Vazirmatn or Estedad (Persian), Manrope or Inter (English), plus one display font for headlines; self-hosted via `next/font` to avoid layout shift.

---

## 5. AI Layer and Demo Mode

### Service / integration layer design

All AI capabilities live in a single **server-only service layer** (`lib/ai/server.ts`) exposing functions such as:

- `naturalLanguageSearch(query: string)`
- `getRecommendations(userId: string)`
- `summarizeReviews(productId: string)`
- `assistArtistDescription(inputs: ArtistAssistantInput)`

AI calls are made exclusively from:

- Route Handlers under `app/api/ai/*`, or
- Server Actions.

Client components never call external AI APIs directly; they call Next.js API routes, which delegate to the server service layer.

### API key handling

- AI provider keys (e.g. `AI_PROVIDER_API_KEY`) live in `.env` / environment variables only.
- They are read **exclusively server-side** and are never bundled into client code or exposed in browser bundles.
- Client-facing UI receives only the sanitized result of an AI call (or a demo-mode label).

### Demo mode behavior

- **No API key configured:** the service layer enters **demo mode** and returns deterministic, clearly simulated results (static recommendation lists, templated review-summary placeholders, draft descriptions marked "AI draft — review before publishing").
- **UI labeling:** every AI-powered page or section displays a visible banner: **"Demo mode — simulated AI response, not real AI."**
- **Never fabricated as real:** demo output is never presented as genuine AI analysis, and a simulated result is never claimed to be a successful transaction or real payment.
- **Key present but request fails:** graceful error handling with a user-visible error message; fallback to general (non-personalized) recommendations instead of silent failure.

---

## 6. Key Technical Decisions

| Decision | Recommendation | Reason |
|----------|----------------|--------|
| **Authentication** | **Auth.js (NextAuth)** | Native App Router support, straightforward role-based sessions (customer / artist / admin), credential + OAuth providers, server-side session validation. |
| **Image storage** | **Cloudinary** (or AWS S3 / Cloudflare R2) | Artist-uploaded high-resolution artwork images need reliable storage plus CDN delivery; `next/image` optimization; unsigned client uploads are avoided for security. |
| **Cart state management** | Hybrid: **DB-backed cart for logged-in users + `localStorage`/cookie cart for guests**, merged on login | Works without logging in; persists across devices and sessions for registered users; server-readable at checkout for inventory and price validation. |
| **Payment gateway** | **Test mode first** (Stripe test mode or an Iranian gateway sandbox such as ZarinPal / IdPay), integrated server-side only | Aligns with the brief: real gateway integration when credentials are available; clearly labeled demo/test mode otherwise; keys never exposed client-side. |
| **Client shell state** | **Zustand** for cart/theme/locale shell state | Minimal dependency, persists well with middleware, keeps Server Components clean. |

---

## 8. Security

- **Password hashing:** argon2 (preferred) or bcrypt; never store plaintext.
- **RBAC enforced server-side:** middleware for route guards + re-check role in Route Handlers / Server Actions.
- **IDOR prevention:** ownership checks on every order, product, and dashboard query (e.g. `where: { id, userId }`; artists only mutate own products).
- **Validation:** Zod schemas on all server inputs (forms, API bodies, query params).
- **Rate limiting:** login, register, password reset, and AI endpoints.
- **Secure image upload:** size/type limits, server-side validation, no unsigned client uploads.
- **Error handling:** no stack traces in production; generic user-facing messages + server logs.
- **Secrets:** env-only; documented in `.env.example`; AI/payment keys server-side only.

---

## 9. Data Integrity and Payments

- **Order placement in DB transactions:** create order + items + decrement stock atomically; rollback on failure.
- **Single-edition stock:** unique artworks use `stock = 1`; guard with atomic decrement / row lock to prevent double-sell race conditions.
- **Server-side price calculation:** never trust client totals; re-fetch prices at checkout.
- **Idempotent payments:** idempotency key / `referenceId` unique check to avoid duplicate charges on retry.
- **Server-side verification:** verify payment with provider callback before marking `PAID`.
- **Constraints/indexes:** `@unique` on `email`, `slug`, `[cartId, productId]`; indexes on `slug`, `userId`, `status`.
- **Audit log:** record sensitive actions (role changes, product moderation, refunds, order status changes).

---

## 10. AI Safety

- **Prompt injection protection:** treat reviews / user content as untrusted data, never as instructions; strip/escape delimiters before including in prompts.
- **Fallback:** generic recommendations and error message when AI is unavailable; never fail checkout/marketplace.
- **Caching:** cache review summaries per product; invalidate on new approved review.
- **Usage limits:** per-user rate limits on AI endpoints to control cost/abuse.

---

## 11. Testing Strategy

- **Unit (Vitest):** price calculation, cart merge, auth/RBAC helpers, Zod schemas.
- **E2E (Playwright):** signup, login, add to cart, test checkout, seller product creation.
- **Failure cases:** unauthorized access, out-of-stock checkout, payment failure, invalid inputs.

---

## 12. DevOps

- **Docker + docker-compose:** `app` + `PostgreSQL` for local/prod parity.
- **GitHub Actions:** lint, test, build on PR/push.
- **Health check:** `GET /api/health` (DB ping + uptime) for container/orchestrator probes.

---

## 13. Design Reference

`_reference/R2` is a visual reference only (color tokens, typography, motifs).
Never copy its backend, auth, i18n runtime, AI layer, seed data or image URLs.
Canonical UI mockups live in `docs/design/` (`01–56` plus `dark/`, `english/`, `mobile/` variants);
token values are transcribed in `docs/design/design-system.md`.

---

## 14. Open Questions

The following items need your decision before implementation:

1. **Payment gateway:** Iranian gateway (ZarinPal / IdPay / Zibal) vs Stripe — and which sandbox/test credentials will be used?
2. **Default locale:** Persian (`/fa/`) or English (`/en/`) as the root redirect?
3. **Image provider:** Cloudinary vs AWS S3 / Cloudflare R2 — do you have an existing account or budget preference?
4. **Auth providers:** Email/password only, or add OAuth (Google, Apple)?
5. **AI provider/vendor:** OpenAI, Google Gemini, or another provider — and which model per feature (search, recommendations, review summaries, artist assistant)?
6. **SEO localization strategy:** subdirectory (`/fa/`, `/en/`) vs separate domains?
7. **Seed data scope:** how many sample products / artists for initial testing, and which licensed placeholder source (Unsplash / Pexels with attribution)?
8. **Deployment target:** Vercel, self-hosted Docker, or other — affects middleware / edge compatibility?
