# TESTING.md — استراتژی و وضعیت تست

**Last updated:** ۱۴۰۵/۰۹/۰۸

## اجرا

```bash
bun run test:unit          # Vitest unit (بدون DB)
TEST_DATABASE_URL=postgresql://... bun run test:integration   # Vitest + Postgres واقعی
bun run test:e2e           # Playwright (نیازمند: bunx playwright install chromium)
BASE_URL=... bun run smoke # اسموک استقرار (M11)
```

CI (`.github/workflows/ci.yml`): lint → tsc → unit → integration (سرویس Postgres)
→ build → E2E (سرویس Postgres + seed) → audit.

## پوشش

### Unit (۳۰ تست)
- `money.ts`: applyBps (گردکردن صحیح، رد ورودی نامعتبر)، splitProportionally
  (تساوی مجموع=کل در ۲۰۰ مورد تصادفی، توزیع largest-remainder).
- `state-machines.ts`: تمام گذارهای مجاز/غیرمجاز ۸ ماشین + derive وضعیت والد.
- `ids.ts` / `image-safety.ts`: slug فارسی، رد traversal/URL خارجی/backslash.
- `session.ts`: hash نسخه‌دار scrypt + verify فرمت legacy.

### Integration (۶ سناریو — Postgres واقعی)
1. lifecycle چندفروشنده: سفارش + رزرو → finalize → 2×SellerOrder + ledger
   دقیق (Σnet=total، ΣSALE+ΣCOMMISSION=total−commission) + رزرو CONVERTED.
2. **دوبار نهایی نشدن:** claim دوم 0 ردیف.
3. **رقابت موجودی:** ۸ decrement هم‌زمان روی موجودی ۵ → دقیقاً ۵ موفق.
4. **لغو + برگشت ledger:** Σentries=0 و موجودی برگشته.
5. **رقابت تخفیف:** ۶ مصرف هم‌زمان از maxUses=1 → دقیقاً ۱ مصرف.
6. **ثبت‌نام هرگز ADMIN نمی‌سازد** (M3).

### E2E (Playwright — chromium)
- خرید کامل با پرداخت موفق (ادعای برچسب نمایشی، رسیدن به صفحه سفارش).
- پرداخت لغوشده: بنر لغو، بدون نتیجه موفق.
- پلن استادکار: سقف/کارمزد/کمیسیون visible.
- ثبت‌نام بدون گزینه ADMIN.

### Smoke (۲۴ چک — scripts/smoke.ts)
health/ready/cron-401/sitemap/robots، صفحات ویترین، گارد‌های نقش، هدرهای
امنیتی، مرز پرداخت (authority نامعلوم ⇒ redirect بدون SUCCESS).

## وضعیت اجرا در این نشست

- unit ✅ ۳۰/۳۰ — integration ✅ ۶/۶ (Postgres محلی ۵۴۳۳)
- lint ✅ — tsc ✅ — build ✅ — smoke ✅ ۲۴/۲۴ (روی dev :3100)
- E2E ⚠️ نوشته‌شده؛ اجرای مرورگر نیازمند `bunx playwright install chromium`
  (در sandbox دانلود نشد) — در CI خودکار اجرا می‌شود.
- E2E دستی agent-browser: خرید کامل موفق ✅ (بررسی DB: SellerOrder/ledger/رزرو/سبد).
