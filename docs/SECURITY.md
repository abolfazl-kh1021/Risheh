# SECURITY.md — مدل امنیتی ریشه

**Last updated:** ۱۴۰۵/۰۹/۰۸ — پس از فاز حفاظت (Phase 1)

## ۱) مرزهای اعتماد

- **اعتبارسنجی و مجوز فقط سمت سرور:** قیمت، جمع، موجودی، تخفیف، سقف پلن، نقش و
  مالکیت در `src/lib/actions/*` و loaderهای `data.ts`. کلاینت هرگز نتیجه‌ی
  پرداخت، نقش یا مبالغ را تایید نمی‌کند.
- **middleware فقط UX است:** گارد نقش در `src/middleware.ts` re-validation
  اکشن‌ها را جایگزین نمی‌کند.
- **پارامتر query هرگز مرجع پرداخت نیست:** `/api/payment/callback` فقط با
  `provider.verify` نتیجه را تعیین می‌کند؛ نتیجه‌ی درگاه دمو در
  `PaymentAttempt.demoOutcome` روی سرور ذخیره شده است.

## ۲) احراز هویت

- scrypt نسخه‌دار (`s1:16384:8:1:salt:hash`)، نشست‌های ۲۵۶بیتی تصادفی در Postgres
  با کوکی httpOnly/SameSite=Lax/Secure (امضای HMAC با AUTH_SECRET).
- `AUTH_SECRET` اجباری ≥۳۲ نویسه؛ بدون آن بوت fail می‌شود (بدون fallback).
- قفل موقت ورود: ۲۰/۱۰دقیقه per-IP و ۸/۱۵دقیقه per-IP+account؛ پیام یکسان.
- پیام ثبت‌نام بدون افشای وجود ایمیل؛ ثبت‌نام فقط BUYER/ARTISAN —
  **ADMIN فقط provision** (`admin:create`)؛ تست integration این را قفل می‌کند.
- تغییر گذرواژه با گذرواژه فعلی + ابطال سایر نشست‌ها؛ صفحه‌ی نشست‌های فعال
  (IP/UA/زمان) + خروج از همه‌ی دستگاه‌ها.

## ۳) Rate limiting

Postgres-backed (`rate_limit_buckets`) با UPSERT اتمیک و کلید `action|ip` —
serverless-safe (نسخه‌ی in-memory با کلید سراسری حذف شد). ورود، ثبت‌نام، پرداخت،
استعلام، آپلود، تسویه، مرجوعی و پیگیری همگی محدود و purge در cron.

## ۴) هدرها

CSP (default-src self؛ script-src self+inline برای Next/JSON-LD)، HSTS
(2 سال preload)، X-Frame-Options DENY، nosniff، Referrer-Policy
strict-origin-when-cross-origin، Permissions-Policy (دوربین/میکروفون/جی‌پی‌اس
بسته). `poweredByHeader: false`.

## ۵) آپلود تصویر (S1)

magic bytes (نه پسوند) → سقف ۵MB → بازکدگذاری `sharp` به WebP (حذف EXIF/GPS) →
نام تصادفی → StorageProvider (local یا Vercel Blob). مسیرهای تصویر آثار با
`normalizeImagePath` سفارشی‌سازی می‌شوند: بدون `..`، بدون URL خارجی، فقط
`/assets/img/` و `/uploads/`.

## ۶) مسیرهای پرداخت/مالی

- claim اتمیک `PENDING→…` هرگز اجازه‌ی دوبرابرِ نهایی‌سازی نمی‌دهد (M6).
- کاهش موجودی گارد‌دار داخل تراکنش؛ موجودی منفی ناممکن.
- مصرف تخفیف با گارد `usedCount < maxUses` داخل تراکنش.
- `PAID` تسویه اتمیک با بازبینی مانده داخل تراکنش — واریز دوباره ناممکن.
- `PaymentEvent` برای هر REQUESTED/CALLBACK/VERIFY_* — لاگ غیرقابل‌ویرایش نتیجه.

## ۷) نکته‌های ریسک معلوم

- `/uploads` روی Docker در FS کانتینر می‌نشیند؛ برای ماندگاری volume بدهید یا
  روی Vercel `BLOB_READ_WRITE_TOKEN` تنظیم کنید.
- `api/health` بدون احراز عمداً باز است (probe)؛ `/api/ready` فقط سیگنال DB
  می‌دهد و داده‌ای لو نمی‌دهد.
- audit log فعلاً UI فیلتر ساده دارد؛ append-only بودن آن روی سطح DB (rule /
  trigger) به go-live موکول شد — در GO_LIVE checklist ثبت است.
