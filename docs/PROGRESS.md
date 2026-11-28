# PROGRESS.md — وضعیت فعلی

**Last updated:** ۱۴۰۵/۰۹/۰۸ (2026-11-29, Asia/Tehran)
**فاز:** بازنویسی کامل C2C (فاز ۱ تا ۶ سند Scope Lock) — پیاده‌سازی شد.

## انجام‌شده (با مدرک)

| فاز | کار | فایل‌های کلیدی |
|---|---|---|
| ۱ | مرز پرداخت + finalize اتمیک/idempotent، ماشین حالت‌ها، رزرو ۱۵دقیقه، enum/ایندکس، رفع باگ‌ها (SOLD، کد crypto، استعلام equals، مسیر تصویر، ویرایش مادی)، rate limiter Postgres، هدرهای امنیتی، DEMO_MODE + admin:create، cron امن | `payments/*`, `state-machines.ts`, `cron-tasks.ts`, `rate-limit.ts`, `ids.ts`, `image-safety.ts`, `next.config.ts`, `middleware.ts`, `vercel.json`, `docker/*` |
| ۲ | بازنویسی Plan/Subscription/Invoice/Revenue، enforce سقف+کارمزد، جریان فاکتور کارمزد، صفحات پلن، cron انقضا/downgrade، ledger سه‌مرحله‌ای + M8، گزارش+CSV ادمین، تسویه اتمیک | `actions/{plans,artworks,admin}.ts`, `payments/finalize.ts`, `views/{PlansManageView,FinanceView}`, `api/admin/revenue.csv` |
| ۳ | احراز هویت سخت‌گیرانه، دروازه عضویت، دفترچه آدرس، روش‌های ارسال DB، ادغام سبد مهمان، SellerOrder+تایم‌لاین، مرجوعی با برگشت ledger، تایید تحویل، پیگیری مهمان، اعلان درون‌برنامه‌ای | `actions/{auth,addresses,orders,notifications}.ts`, `views/{OrderDetailView,SellerOrdersView,AccountView}` |
| ۴ | مهاجرت به App Router واقعی + middleware + sitemap/robots/JSON-LD + حذف loadAppData + جستجو/فیلتر/مرتب/صفحه‌بندی سرور | `app/(storefront)/*`, `PageView.tsx`, `shell.tsx`, `nav.ts`, `data.ts` |
| ۵ | نظرات DELIVERED-only، استعلام شفاف، آپلود امن sharp، صفحه استادکار عمومی، بلاگ، صفحات قانونی/FAQ، بخش‌های ادمین، UX (loading/empty/disabled) | `actions/{reviews,upload}.ts`, `storage/provider.ts`, `views/*` |
| ۶ | ۳۶ تست (unit+integration با رقابت واقعی)، E2E Playwright، smoke ۲۴چک، CI، مستندات کامل | `tests/*`, `scripts/smoke.ts`, `.github/workflows/ci.yml`, `docs/*` |

## دستورهای اجرا و نتیجه (این نشست)

- `bun run lint` → ✅ صفر خطا
- `bunx tsc --noEmit` → ✅ صفر خطا
- `bun run build` → ✅ موفق (کل مسیرها؛ typecheck اجباری)
- `bunx vitest run tests/unit` → ✅ ۳۰/۳۰
- `bunx vitest run tests/integration` (Postgres واقعی) → ✅ ۶/۶
- `bun run smoke` (روی سرور dev) → ✅ ۲۴/۲۴
- `prisma migrate deploy` روی Postgres خالی → ✅ (baseline `20261129000000_init_c2c` + additive‌ها)
- جاروب ریسپانسیو ۳۶۰→۱۵۳۶ (۸ صفحه × ۶ عرض) → ✅ صفر overflow (PERFORMANCE.md)
- E2E Playwright → ⚠️ نوشته شد و config کامل؛ اجرای مرورگرها نیازمند
  `bunx playwright install chromium` (در sandbox اجرا نشد — محدودیت شبکه/حجم؛
  در CI خودکار اجرا می‌شود). دستور: `bun run test:e2e`
- `bun run dev` روی Vercel/Docker deploy → اقدام کاربر (M11؛ docs/DEMO_ACCOUNTS.md)

## مسیرهای خرید تاییدشده به‌صورت E2E واقعی (agent-browser)

- خریدار: ورود → افزودن به سبد → تسویه → درگاه نمایشی → پرداخت موفق →
  سفارش PAID با ۲ SellerOrder (دو فروشنده)، رزرو CONVERTED، ledger SALE/COMMISSION
  دقیق، PlatformRevenue، سبد پاک، اعلان‌ها. ✅ (بررسی DB + UI)
- callback روی origin درست ریدایرکت می‌کند (باصفحه‌ی `/orders/[orderNumber]`).

## موارد باز / یادداشت‌ها

1. `playwright install` در sandbox اجرا نشد — E2E در CI سبز می‌شود.
2. آپلود روی Vercel نیازمند `BLOB_READ_WRITE_TOKEN` است؛ بدون آن پیام شفاف
   «از کتابخانه تصاویر استفاده کنید» نمایش داده می‌شود.
3. تغییر نقش کاربر توسط ادمین (تغییر نقش با لاگ) فعلاً فقط تعلیق/رفع تعلیق
   است؛ تغییر نقش به ARTISAN از مسیر تایید عضویت انجام می‌شود.
