# HANDOFF.md — ادامه از اینجا

## ۱) وضعیت

بازنویسی کامل C2C (فاز ۱–۶ سند Scope Lock) پیاده‌سازی و تست شده است.
همه‌ی lint/tsc/build/unit/integration/smoke سبز. E2E آماده ولی در sandbox
اجرا نشد (نیازمند playwright install) — در CI خودکار است.

## ۲) دستورهای سریع

```bash
bun install
# .env: DATABASE_URL, DIRECT_DATABASE_URL, AUTH_SECRET(≥32), DEMO_MODE=true
bash scripts/new-migration.sh <name>   # مایگریشن additive
SEED_FORCE=1 bun prisma/seed.ts        # دموی محلی
bun run dev                            # :3000
bun run lint && bunx tsc --noEmit && bun run build
bun run test:unit && TEST_DATABASE_URL=... bun run test:integration
BASE_URL=http://localhost:3000 bun run smoke
ADMIN_EMAIL=... ADMIN_PASSWORD=... bun run admin:create   # بدون DEMO_MODE
```

## ۳) نقشه فایل‌های مهم

| حوزه | فایل |
|---|---|
| مرز پرداخت | `src/lib/payments/{types,demo,zarinpal,index,finalize}.ts`, `app/api/payment/callback`, `app/pay/demo/[authority]` |
| ماشین حالت‌ها | `src/lib/state-machines.ts` (همه‌ی actionها از assertTransition رد می‌شوند) |
| اقتصاد C2C | `prisma/schema.prisma` (Plan/Subscription/Invoice/PlatformRevenueEntry/LedgerEntry/SellerOrder/PayoutRequest)، `actions/{artworks,plans,orders,admin}.ts` |
| cron | `src/lib/cron-tasks.ts`, `app/api/cron`, `vercel.json` |
| حفاظت | `src/lib/rate-limit.ts`, `next.config.ts` (هدرها)، `middleware.ts` |
| آپلود | `src/lib/storage/provider.ts`, `actions/upload.ts` |
| مسیرها/SEO | `app/(storefront)/**`, `nav.ts`, `shell.tsx`, `PageView.tsx`, `sitemap.ts`, `robots.ts` |
| تست‌ها | `tests/unit/*`, `tests/integration/*` (Postgres واقعی), `tests/e2e/*`, `scripts/smoke.ts` |

## ۴) قراردادهایی که نباید بی‌ملاحظه تغییر کنند

- نتیجه پرداخت فقط از `/api/payment/callback` + `provider.verify` (نه query).
- همه‌ی مبالغ integer تومان با `lib/money.ts` (largest-remainder).
- ادمین فقط provision؛ `DEMO_MODE` بدون seed.
- برچسب «نمایشی/شبیه‌سازی» روی هر نقش شبیه‌سازی‌شده.
- شماره‌ی رهگیری حمل ثبت نمی‌شود (Won't)؛ فقط رویداد وضعیت.

## ۵) گام بعدی پیشنهادی

1. Deploy Vercel: envها + `prisma migrate deploy` + `bun run smoke` روی URL واقعی (M11).
2. `GO_LIVE_PAYMENT_CHECKLIST.md` برای درگاه واقعی (وقتی مجاز شد).
3. Playwright را در CI فعال دیدن (خودکار) و در sandbox با `bunx playwright install chromium`.
