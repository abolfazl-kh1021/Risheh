# GO_LIVE_PAYMENT_CHECKLIST.md — اتصال درگاه واقعی و تسویه واقعی

این سند دقیقاً می‌گوید برای سوییچ از پرداخت نمایشی به درگاه واقعی (مثلاً زرین‌پال)
چه چیزی باید تغییر کند. **نکته کلیدی معماری:** سفارش، ledger، فاکتور، UI و
callback هیچ تغییری نمی‌خواهند — همه فقط با `PaymentProvider` حرف می‌زنند.

## ۱) مرز فعلی (همین امروز)

```
createOrderAction / submitForReviewAction / buyPlanAction
        │ provider.request({invoiceOrOrderId, amount, callbackUrl})
        ▼
PaymentAttempt(authority, PENDING)  ──►  /pay/demo/[authority]   (برچسب «نمایشی»)
        ▼ کاربر نتیجه را در صفحه دمو انتخاب می‌کند (server action ذخیره می‌کند)
        ▼
GET /api/payment/callback?authority=…
        │ provider.verify({authority, amount})  ← نتیجه فقط از سرور
        ▼
finalizeOrderPayment / finalizeInvoicePayment   (تراکنش اتمیک + idempotent claim)
        ▼
PAID → SellerOrder + Ledger + PlatformRevenue + Notification + رزرو→فروش
```

## ۲) فایل‌هایی که تغییر می‌کنند (و فقط همین‌ها)

| فایل | تغییر |
|---|---|
| `src/lib/payments/zarinpal.ts` | پیاده‌سازی واقعی `request/verify/refund` با API زرین‌پال (request → authority + Redirect URL؛ verify با amount مطابقت دقیق) |
| `src/lib/payments/index.ts` | `PAYMENT_PROVIDER=zarinpal` را برگرداند (الان خودش این کار را می‌کند — فقط پیاده‌سازی بالا لازم است) |
| `.env` (محیط واقعی) | `PAYMENT_PROVIDER=zarinpal` و کلیدهای زیر |
| `next.config.ts` | اگر CSP نیاز به دامنه CDN درگاه دارد، `connect-src`/`frame-src` به‌روزرسانی شود |

**فایل‌هایی که نباید تغییر کنند:** `orders.ts`, `artworks.ts`, `plans.ts`, `finalize.ts`, `PaymentAttempt`, `Invoice`, ledger, صفحات UI (جز متن «نمایشی» که در حالت واقعی از روی `provider.name !== "demo"` حذف می‌شود — فیلد provider روی تلاش‌ها موجود است).

## ۳) متغیرهای محیطی

```
PAYMENT_PROVIDER=zarinpal
PAYMENT_MERCHANT_ID=…        # مرچنت کد زرین‌پال
PAYMENT_GATEWAY_KEY=…        # اگر از درگاه ملت/زرین‌پال با کلید باشد
PAYMENT_TERMINAL_ID=…        # ترمینال (در صورت نیاز)
NEXT_PUBLIC_BASE_URL=https://…   # برای callbackUrl مطلق درگاه‌های واقعی
```

هیچ مقدار پیش‌فرضی در کد برای کلیدها وجود ندارد و نباید داشته باشد؛ نبود کلید
باید خطای صریح بدهد (اسکلت فعلی همین کار را می‌کند).

## ۴) تسویه واقعی (PayoutProvider)

الان `decidePayoutAction` روی «PAID» یک `LedgerEntry(kind=PAYOUT)` اتمیک می‌نویسد
و برچسب «نمایشی» دارد. برای واریز واقعی:

1. `PayoutProvider` interface بسازید (`transfer({iban, amount, refNumber})`).
2. در `decidePayoutAction` — فقط در شاخه `PAID` — قبل از نوشتن ledger،
   `payoutProvider.transfer` را صدا بزنید؛ در صورت شکست، PAID انجام نمی‌شود.
3. جدول `PayoutRequest.reference` همان شماره پیگیری بانک است (فیلد موجود است).

## ۵) آشتی‌سازی (reconciliation)

- گزارش `/api/admin/revenue.csv` درآمد پلتفرم را از `PlatformRevenueEntry` می‌دهد؛
  با خروجی درگاه (RS file) بر اساس `PaymentAttempt.refNumber` تطبیق دهید.
- برای هر تلاش، `PaymentEvent` (REQUESTED/CALLBACK/VERIFY_*) ثبت می‌شود —
  منبع حقیقت تاریخچه‌ی پرداخت برای رفع اختلاف.
- cron موجود (`/api/cron`) تلاش‌های PENDING قدیمی را بعد از ۲۴ ساعت می‌بندد؛
  در حالت واقعی، «verify دوباره‌گیری» (برای تراکنش‌های callback‌نشده) به همین
  cron اضافه شود.

## ۶) تست‌های قبولی Go-Live (هیچ‌کدام قابل حذف نیست)

1. **سه پیامد:** موفق/ناموفق/لغو واقعی هر سه روی سفارش، کارمزد آگهی و پلن.
2. **دوبار نهایی نشدن:** دو callback هم‌زمان با یک authority → فقط یکی.
3. **مطابقت مبلغ:** verify مبلغ را با `PaymentAttempt.amount` تطبیق می‌دهد؛
   پرداخت کمتر از مبلغ فاکتور باید FAILED برگردد.
4. **برگشت وجه:** refund روی سفارش لغوشده بعد از PAID → ledger معکوس + `REFUNDED`.
5. **رزرو و انقضا:** رزرو ۱۵ دقیقه با پنجره واقعی درگاه تست شود.
6. **smoke:** `BASE_URL=… bun run smoke` سبز + E2E خرید کامل روی محیط sandpit درگاه.
7. **ممیزی متن:** همه‌ی برچسب‌های «نمایشی/شبیه‌سازی» از UI حذف یا به «درگاه امن»
   تغییر یافته باشند (فقط وقتی provider واقعی فعال است).

## ۷) تغییر متنی UI هنگام go-live

متن‌های برچسب‌دار با شرط `getPaymentProvider().name === "demo"` قابل toggle
هستند؛ کافی است کامپوننت‌های `pay/demo/*` را در حالت واقعی به لندینگ درگاه
پوینت کنید و بنر «نمایشی» را با فلگ بپوشانید. هیچ منطق مالی در UI نیست.
