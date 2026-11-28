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


---

# تصمیم‌های بازنویسی C2C (۱۴۰۵/۰۹/۰۸ — فاز ۱ تا ۶)

هر تصمیم با «چرا» و «جایگزین ردشده». این بخش فقط تصمیم‌های جدید این بازنویسی است.

## D-ARCH — مهاجرت از SPA هش‌رouted به App Router واقعی
**چرا:** الزام سند (Phase 4)؛ SEO، متادیتای مستقل هر محصول، URL واقعی callback.
**چطور:** Viewها ۱:۱ حفظ شدند؛ یک bridge `PageView` + `ShellProvider` جای
RishehApp نشسته است. `navigate` قدیمی با adapter (`nav.ts`) به URL واقعی
نگاشت می‌شود تا طراحی و کد ویوها دست‌نخورده بماند.
**جایگزین ردشده:** بازنویسی همه‌ی ویوها به RSC خالص — ریسک از بین رفتن طراحی.

## D-SEO — JSON-LD با dangerouslySetInnerHTML پاک‌سازی‌شده
تنها `dangerouslySetInnerHTML` پروژه، فقط JSON تولیدشده روی سرور با
`.replace(/</g, "\\u003c")` تا از `</script>`-breakout جلوگیری شود.
تست امنیتی «نبود dangerouslySetInnerHTML» به این استثنا با پاک‌سازی رجوع دارد.

## D-PAY — یک مرز پرداخت برای هر سه جریان پرداخت
سفارش خریدار، کارمزد ثبت آگهی و خرید پلن همگی از `PaymentProvider` می‌گذرند؛
نتیجه فقط از `provider.verify` در `/api/payment/callback` (اتمیک، idempotent با
claim `updateMany where status=PENDING`). درگاه دمو نتیجه را در ستون
`PaymentAttempt.demoOutcome` روی سرور ثبت می‌کند — پارامتر query هرگز مرجع نیست.
**جایگزین ردشده:** نگه‌داشتن `verifyDemoPaymentAction` با outcome کلاینت‌محور
(فلو باگ امنیتی شناخته‌شده بود).

## D-PLAN — مدل پلن از جدول `plans` با سقف/کارمزد/کمیسیون
`Plan { maxActiveListings, listingFeeToman, commissionBps, periodDays }`.
کارمزد فروش پیش‌فرض ۱۰٪ برای همه پلن‌ها ولی قابل تغییر از ادمین
(`commissionBps` نقطه‌اساس). سقف آگهی = شمارِ `PUBLISHED + PENDING_REVIEW`.
**مقادیر seed مطابق جدول سند:** رایگان/برنز/نقره/طلایی. `national` حذف شد
(پلن «پیشکسوتان» در سند جدید وجود ندارد؛ اگر لازم شد از پنل ادمین ساخته می‌شود).

## D-PLAN-PRORATE — سیاست ارتقا بدون پروریت ساده و مستند
فعال‌سازی پلن جدید از لحظه پرداخت؛ پلن قبلی CANCELED. تمدید همان پلن از لحظه
پرداخت (بدون ادغام باقیمانده). **چرا:** سادگی، شفافیت حسابداری دمو؛ پیاده‌سازی
پروریت روز‌شمار در GO_LIVE قابل افزودن است بدون تغییر schema.

## D-ESCROW — شبه‌escrow سه‌مرحله‌ای با LedgerStatus
`SALE` در پرداخت = `PENDING`؛ در `DELIVERED` = `HOLDING` با
`availableAt = now + RETENTION_DAYS (Setting، پیش‌فرض ۳)`؛ cron آن را
`CLEARED` می‌کند. برداشت فقط از `CLEARED − درخواست‌های قفل‌شده`.
**جایگزین ردشده:** محاسبه لحظه‌ای از رویدادها — کند و شکننده.

## D-DISCOUNT — مصرف تخفیف فقط در تراکنش نهایی
در ساخت سفارش فقط اعتبارسنجی می‌شود؛ مصرف (`usedCount++` + `Redemption APPLIED`)
داخل تراکنش finalize با گارد `updateMany where usedCount < maxUses`؛ در شکست
پرداخت چیزی مصرف نشده که بخواهد برگردد. تست رقابت دارد.

## D-MEMBER — MemberRequest بدون پلن
درخواست عضویت فقط «تایید هویت» است؛ پلن از Subscription می‌آید (Free پیش‌فرض).
تایید عضویت فقط `verified=true` می‌گذارد و اجازه ارسال/انتشار می‌دهد.

## D-LISTING-FEE — کارمزد آگهی: فاکتور → پرداخت → صف ادمین
ارسال برای بازبینی ⇒ سقف پلن چک می‌شود ⇒ اگر `listingFeeToman>0` فاکتور
LISTING_FEE + تلاش پرداخت ساخته می‌شود؛ پس از verify موفق، اثر در
`PENDING_REVIEW` برای ادمین می‌نشیند. در `REJECTED` با فلگ
`LISTING_FEE_REFUND_ON_REJECT` (پیش‌فرض true) کارمزد به‌صورت اعتبار
`LedgerEntry(kind=LISTING_FEE_REFUND, CLEARED)` برمی‌گردد — نه بازگشت بانکی.

## D-MATERIAL-EDIT — ویرایش مادی ⇒ بازگشت به بازبینی
تغییر عنوان/توضیح/داستان/تصاویر/متریال/ابعاد یک `PUBLISHED` ⇒ `PENDING_REVIEW`
و بازگشایی رکورد اصالت (`AuthenticityRecord.status=PENDING` + VerificationEvent).
تغییر قیمت/موجودی بدون بازبینی. سیگنچر مادی با مقایسه JSON فیلدها.

## D-RESERVATION — رزرو ۱۵ دقیقه + موجودی قابل خرید
موجودی قابل خرید = `stock − Σ ACTIVE reservations`؛ در finalize کاهش گارد‌دار
(`stock >= qty`)؛ در شکست/لغو/انقضا RELEASED. سفارش PENDING_PAYMENT پس از
`PENDING_PAYMENT_TTL_MINUTES (۶۰)` با cron منقضی می‌شود.

## D-RATELIMIT — Postgres-backed limiter
In-memory روی serverless بی‌اثر است و کلید سراسری همه را قفل می‌کرد.
`rate_limit_buckets` با UPSERT اتمیک؛ کلیدها `action|ip` و برای ورود
`login|ip` + `login|acct:ip:email` با پیام خطای یکسان (بدون افشای وجود ایمیل).

## D-AUTH — AUTH_SECRET اجباری ≥۳۲ و گذرواژه‌ی نسخه‌دار
`hashPassword` اکنون `s1:N:r:p:salt:hash` با N=16384 صریح؛ verify از فرمت قدیمی
`salt:hash` هم پشتیبانی می‌کند (مهاجرت نرم). تغییر گذرواژه با گذرواژه فعلی +
ابطال سایر نشست‌ها.

## D-DEMO-MODE — بدون DEMO_MODE هیچ seed و هیچ کاربر پیش‌فرض
`prisma/seed.ts` بدون `DEMO_MODE=true` (یا `SEED_FORCE=1` برای dev محلی) رد
می‌شود؛ `entrypoint.sh` داکر هم همین شرط را دارد. ادمین فقط با
`bun run admin:create` که `DEMO_MODE=true` را هم رد می‌کند.

## D-GUEST-TRACK — پیگیری مهمان بدون OTP
`orderNumber + buyerPhone` با rate-limit ۱۰/دقیقه و پیام خطای یکسان برای
«نیست/نادرست» (بدون enumeration). OTP/SMS ممنوع (Won't).

## D-MULTI-SELLER — SellerOrder + derive وضعیت والد
هر فروشنده زیرسفارش مستقل دارد (`@@unique([orderId, sellerId])`)؛ وضعیت والد از
زیرسفارش‌ها مشتق می‌شود (`deriveOrderStatus`) و هر گذار `OrderEvent` می‌سازد.
فروشنده فقط ردیف‌ها/آیتم‌های خودش را می‌بیند (تست دارد).

## D-CRON — vercel.json + CRON_SECRET
`/api/cron` بدون `CRON_SECRET` ۴۰۱ می‌دهد (cron کامل غیرفعال). وظایف:
انقضای رزرو/سفارش/آگهی/اشتراک (+بایگانی مازاد هنگام downgrade)، آزادسازی
نگهداری، پاکسازی نشست/باکت/TLS قدیمی پرداخت.

## D-SEO-2 — sitemap داینامیک + robots + JSON-LD محصول + OG per-page
هر مسیر `generateMetadata` دارد؛ sitemap از DB ساخته می‌شود؛ robots مسیرهای
خصوصی را disallow می‌کند.

## D-BUILD — ignoreBuildErrors=false
تایپ‌چک دیگر دور زده نمی‌شود؛ کل پروژه با tsc تمیز بیلد می‌شود.
