# PERFORMANCE.md — کارایی و ریسپانسیو

**Last updated:** ۱۴۰۵/۰۹/۰۸ (2026-11-29) — پس از مهاجرت به App Router و حذف
`loadAppData` یکپارچه.

## ۱) رکورد جاروب ریسپانسیو (M9 — الزام سند)

جاروب خودکار با مرورگر واقعی (agent-browser/Chromium)، سنجش
`document.documentElement.scrollWidth - window.innerWidth`:

| عرض (px) | خانه | /products | /c/carpet | صفحه محصول | /cart | /blog | /verify | /plans |
|---|---|---|---|---|---|---|---|---|
| 360  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 390  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 768  | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1024 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1280 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| 1536 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

**۴۸/۴۸ چک — صفر overflow افقی در همه‌ی عرض‌های الزامی ۳۶۰→۱۵۳۶.**
(۰ = هیچ سرریز افقی؛ مقیاس: پیکسل)

روش بازتولید:
```bash
for W in 360 390 768 1024 1280 1536; do
  agent-browser set viewport $W 800
  for P in / /products /c/carpet /products/shikargah-silk-qashqai /cart /blog /verify /plans; do
    agent-browser open "http://localhost:3100$P"
    agent-browser eval "Math.max(document.documentElement.scrollWidth - window.innerWidth, 0)"
  done
done
```

## ۲) معماری داده پس از Phase 4 (حذف loadAppData)

قبلاً یک `loadAppData()` کل دیتابیس را در هر بارگذاری می‌خواند. اکنون:

| مسیر | واکشی | pagination |
|---|---|---|
| `/` | `loadHomeData` — featured 8 + latest 12 + پست‌ها ۶ | take محدود |
| `/products`, `/c/[slug]` | `loadCatalog` — WHERE/ORDER/skip/take سمت سرور با فیلتر دسته/قیمت/استان/«تاییدشده» | pageSize=12، `?page=` |
| `/products/[slug]` | یک اثر + مرتبط‌ها (take 8) | — |
| `/cart` | سبد کاربر/مهمان + دفترچه آدرس + روش‌های ارسال فعال | — |
| `/orders` | سفارش‌های خریدار (take 30) + sellerOrders + events | take |
| `/dashboard/orders` | `SellerOrderRow` فقط فروشنده‌ی جاری (take 80) | take |
| `/dashboard/finance` | ledger take 100 + payouts + invoices take 50 | take |
| `/admin` | صف‌ها با take 40–100؛ آمار با `count`/`groupBy` (بدون واکشی کل ردیف‌ها) | take |

- کش فقط برای داده‌ی عمومی: `categories-with-counts` و کاتالوگ با TTL 10s و
  invalidation صریح در actionهای تغییردهنده (`invalidatePublicCatalog`).
- شمارش موجودی قابل خرید = `stock − Σ رزرو فعال` با `groupBy` روی جدول
  `stock_reservations` (ایندکس `[artworkId, status]`).

## ۳) ایندکس‌های اضافه‌شده (فاز ۱)

- `artworks(status, createdAt)`, `artworks(sellerId, status)`, `artworks(categoryId, status)`
- `orders(status, createdAt)`, `orders(buyerId, createdAt)`, `orders(guestKey)`
- `seller_orders(sellerId, status)` + `@@unique([orderId, sellerId])`
- `ledger_entries(sellerId, createdAt)`, `(sellerId, status)`, `(availableAt)`
- `sessions(expiresAt)` برای پاکسازی cron
- `stock_reservations(artworkId, status)`, `(expiresAt)`
- `invoices(payerId, createdAt)`, `(status)`, `subscriptions(expiresAt)`

## ۴) موارد حفظ‌شده از نسخه قبل

- فونت‌های self-hosted با cache immutable یک‌ساله؛ تصاویر AVIF/WebP با
  deviceSizes؛ SW فقط برای assets.
- code splitting ویوها با `next/dynamic` در `PageView`.
- Toaster و skeleton/empty-state ها.

## ۵) بودجه‌های عملیاتی

- `/api/health` بدون DB؛ `/api/ready` با چک `SELECT 1`.
- cron هر ۱۰ دقیقه: انقضای رزرو/سفارش/آگهی/اشتراک، آزادسازی نگهداری، پاکسازی
  نشست و باکت‌های rate-limit.
