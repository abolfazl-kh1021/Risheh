# ARCHITECTURE.md

**Last updated:** ۱۴۰۵/۰۹/۰۸ — پس از مهاجرت به App Router و بازنویسی C2C

## ۱) استک

Next.js 16 (App Router) + React 19 + TypeScript strict + Tailwind 4 + Prisma 6 /
PostgreSQL (Neon یا local). Server Actions برای همه‌ی جهش‌ها. طراحی
«Persian Luxury Heritage» حفظ شده (`globals.css`، Vazirmatn).

## ۲) مسیرها (App Router واقعی — hash routing حذف شد)

```
(storefront)/
  /                      خانه (M1)
  /products              فهرست کامل + جستجو/مرتب/فیلتر سرور
  /c/[slug]              صفحه دسته (۸ دسته)
  /products/[slug]       صفحه محصول + JSON-LD + OG
  /artisans/[slug]       صفحه عمومی استادکار (M2)
  /cart                  سبد و تسویه‌حساب چندمرحله‌ای (M5)
  /orders, /orders/[orderNumber]   تاریخچه + جزئیات + تایم‌لاین (M7)
  /track                 پیگیری مهمان (شماره سفارش + موبایل)
  /account/login, /account, /account/notifications
  /dashboard             داشبورد نقش‌محور (M4)
  /dashboard/{artworks,orders,finance,lab,plans}
  /admin                 پیشخوان مدیریت (S3–S7)
  /plans                 مقایسه عمومی پلن‌ها
  /blog, /blog/[slug]    بلاگ (S4)
  /verify                استعلام اصالت (M10)
  /about /contact /app /faq /terms /privacy /shipping /discounts /favorites
/pay/demo/[authority]    درگاه نمایشی (bare layout)
/api/payment/callback    کال‌بک پرداخت (تنها نقطه‌ی نهایی‌سازی)
/api/cron                cron امن با CRON_SECRET
/api/health, /api/ready  پروب‌ها
api/admin/revenue.csv    گزارش درآمد ادمین
sitemap.ts / robots.ts / middleware.ts
```

لینک‌های قدیمی `#/view/param` با `nav.ts` و aliasهای middleware به مسیرهای
واقعی نگاشت می‌شوند.

## ۳) جریان داده (بعد از حذف loadAppData)

```
layout (storefront) → loadShellData (user/cartCount/categories/unread)
page → loader اختصاصی (select محدود + pagination)
     → <PageView view data route/>   (client bridge با context شل)
view → Server Actions ("use server") → revalidate
```

- کش فقط داده عمومی (TTL 10s + invalidation).
- همه‌ی جهش‌ها: Zod → getCurrentUser → نقش/مالکیت → ماشین حالت → تراکنش.

## ۴) موتور اقتصادی C2C

- `Plan` (رایگان/برنز/نقره/طلایی) → `Subscription` (ACTIVE واحد) →
  سقف آگهی + کارمزد ثبت + `commissionBps` همگی enforce سمت سرور.
- چرخه آگهی: DRAFT → PENDING_REVIEW (با فاکتور کارمزد) → PUBLISHED (۶۰ روز) →
  EXPIRED/ARCHIVED/SOLD + REJECTED با بازگشت اعتباری کارمزد.
- سفارش چندفروشنده: `Order` ⇒ `SellerOrder` هر فروشنده؛ تخفیف نسبی با
  largest-remainder؛ وضعیت والد مشتق؛ `OrderEvent` تایم‌لاین.
- شبه‌escrow: SALE = PENDING → (DELIVERED) HOLDING(+availableAt) → (cron) CLEARED.
- درآمد پلتفرم: `PlatformRevenueEntry {LISTING_FEE | SUBSCRIPTION | COMMISSION}`
  + گزارش بازه‌ای و CSV ادمین.
- تسویه: `PayoutRequest` PENDING→APPROVED→PAID|REJECTED با PAID اتمیک.

## ۵) مرز پرداخت

`src/lib/payments/*` — interface طبق سند §۴.۶؛ DemoProvider جریان واقعی را
شبیه‌سازی می‌کند (`/pay/demo/[authority]` با برچسب «نمایشی» + کال‌بک واقعی).
ZarinpalProvider فقط اسکلت TODO (Won't). همه‌ی خریدها از همین لایه می‌گذرند.
اتصال بعدی: `docs/GO_LIVE_PAYMENT_CHECKLIST.md`.

## ۶) cron و حفاظت

`vercel.json` هر ۱۰ دقیقه `/api/cron` با `CRON_SECRET`: انقضای رزرو/سفارش/آگهی/
اشتراک (+downgrade بایگانی مازاد)، آزادسازی نگهداری، پاکسازی نشست/باکت.
Rate limiter در Postgres؛ هدرهای امنیتی در next.config + middleware.

## ۷) آزمون‌ها

- Unit (Vitest): پول/گردکردن، ماشین‌های حالت، کد/slug، ایمنی مسیر تصویر، hash.
- Integration (Postgres واقعی): lifecycle سفارش، رقابت موجودی/تخفیف، idempotent
  claim، لغو+برگشت ledger، ثبت‌نام هرگز ADMIN.
- E2E (Playwright): خرید موفق/لغو، پلن استادکار، ثبت‌نام بدون ADMIN.
- Smoke: `bun run smoke` روی BASE_URL (۲۴ چک برای M11).
- CI: `.github/workflows/ci.yml` — lint/tsc/unit/integration/build + e2e با
  سرویس Postgres.
