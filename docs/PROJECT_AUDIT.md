# PROJECT_AUDIT.md — Source Archive Audit (Phase 0)

**Source:** `Risheh.rar` (extracted to `risheh-source/Risheh/`, kept out of the build).
**Audit method:** full extraction, per-page scripted extraction of headings/nav/images/
forms/buttons (`scripts/audit_pages.py`, `scripts/extract_refs.py`), per-page text
references in `risheh-source/refs/*.txt`, plus direct HTML/CSS reading.

## 1. Source inventory

### Pages (16 HTML files)

| # | Source page | Size | Intended final view (hash route) | Implemented |
| --- | --- | --- | --- | --- |
| 1 | `index.html` | 51 KB | `#/home` | ✅ (brand palette variant preserved) |
| 2 | `categories.html` | 502 KB (embedded React app) | `#/categories/:slug` | ✅ (rebuilt as one filterable view) |
| 3 | `product-details.html` | 71 KB | `#/product/:id` | ✅ (gallery, variants, specs, reviews, FAQ, authenticity) |
| 4 | `cart-checkout.html` | 74 KB | `#/cart` | ✅ (items, address, shipping methods, summary) |
| 5 | `payment-confirm.html` | 58 KB | `#/payment` + `#/payment/:orderNumber` | ✅ (labeled demo gateway + result states) |
| 6 | `login-register.html` | 78 KB | `#/login` | ✅ (role selector, tabs, OTP method disabled with honest notice) |
| 7 | `user-dashboard.html` | 87 KB | `#/dashboard` | ✅ (artisan + buyer variants) |
| 8 | `my-artworks.html` | 79 KB | `#/artworks` | ✅ (status tabs, create/edit editor) |
| 9 | `orders-shipping.html` | 70 KB | `#/orders` | ✅ (buyer tracking + seller fulfilment table) |
| 10 | `finance-settlement.html` | 69 KB | `#/finance` | ✅ (ledger, balances, settlement requests) |
| 11 | `authenticity-lab.html` | 69 KB | `#/lab` | ✅ (portfolio queue, sample send, photo session) |
| 12 | `authenticity-verify.html` | 84 KB | `#/verify` | ✅ (certificate, lab report, lineage, security guide) |
| 13 | `blog.html` | 98 KB | `#/blog` | ✅ (featured, categories, article view, glossary) |
| 14 | `contact.html` | 75 KB | `#/contact` | ✅ (info cards, validated form, success state) |
| 15 | `about.html` | 87 KB | `#/about` | ✅ (story, pillars, timeline, council, licenses, CTA) |
| 16 | `admin-dashboard.html` | 155 KB (embedded React app) | `#/admin` | ✅ (7 sections, subscription model preserved) |

Notes:
- `categories.html` and `admin-dashboard.html` embed full React apps (Babel-standalone).
  Their data (8 categories × 6 products with titles/descriptions/prices/images; 4
  subscription plans; transaction rows) was extracted verbatim into
  `risheh-source/refs/catalog.json` and used as seed data.
- `docs/stitch/` contains `DESIGN-*.md` design specs (all identical: "Persian Luxury
  Heritage") — used as the design contract, not shipped in production.

### Assets

- `assets/img/` — 129 images (27 MB). 70 referenced by the pages; all 70 were copied
  locally (`public/assets/img/`), including 70 Google-hosted (`lh3.googleusercontent.com`)
  images downloaded for self-containment. Total local library: 200 files.
- `assets/fonts/` — Vazirmatn variable font (3 unicode-range woff2 + full 4 MB file)
  and Material Symbols Outlined (4 MB woff2) — copied to `public/assets/fonts/`.
- `assets/vendor/` — Tailwind CDN v3 build + React UMD bundles (reference only,
  NOT shipped; the app uses Tailwind 4 + Next.js).
- `assets/js/main.js` — mobile drawer behavior; reimplemented in React.

### Design system findings

- 15/16 pages share a **Material-3-style tonal palette** (teal primary `#002624`,
  container `#0f3d3a`, gold tertiary `#cd953d`, cream surfaces `#fff8f0`→`#e9e2d5`).
- `index.html` uses a slightly different "brand" palette (teal `#0E3B36`, gold
  `#D89E3D`, cream `#FDF6ED`). **Both palettes were preserved** — the home view uses
  brand tokens; all other views use M3 tokens (matching the source page exactly).
- Typography: Vazirmatn across the board, with a documented type scale
  (headline-xl 44/60 → label-sm 11/16) in `docs/DESIGN_SYSTEM.md`.
- Shared chrome: top utility bar (support/cart/favorites/account) + main bar (logo,
  search, nav) + mobile drawer + footer (4 columns, newsletter) — identical across M3
  pages; implemented once in `SiteHeader`/`SiteFooter`.

## 2. Functional findings from the source

- Cart flow: 2-step (cart → address/shipping → pay) with shipping method pricing
  (پیک ۵۰,۰۰۰ / تیپاکس ۷۵,۰۰۰ / رایگان), gift wrap, coupon placeholder.
- Payment result page exists for success; failure/cancel/pending states were missing
  in the source → implemented honestly in the demo gateway.
- Admin is a **subscription/membership** model (پلن برنزی/نقره‌ای/طلایی/پیشکسوتان),
  transaction log with Persian gateway names (به‌پرداخت ملت، زیبال), audit log —
  preserved as the operational model.
- The source has no backend, no real auth, no uploads — everything was dummy data.

## 3. Gaps / uncertainties found in the source

1. Hero/product images hotlinked to `lh3.googleusercontent.com` → downloaded locally.
2. OTP login flow has UI but no provider → password login implemented; OTP tab shows
   an honest "SMS provider not configured" notice.
3. "Upload from your system" buttons in the artwork form → replaced with a curated
   image-library picker (upload requires a storage provider; documented).
4. Blog download/PDF buttons → not implemented (no delivery provider); not shown as
   fake-downloadable.
5. Persian dates in the source are illustrative (۱۴۰۳); the app formats real dates
   with `Intl.DateTimeFormat('fa-IR')`.
