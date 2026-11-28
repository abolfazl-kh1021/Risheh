# CHANGELOG

## v1.0.0 — بازنویسی کامل C2C (۱۴۰۵/۰۹/۰۸ / 2026-11-29)

### Added
- مرز پرداخت استاندارد `PaymentProvider` + DemoProvider + اسکلت Zarinpal (Won't)؛
  کال‌بک سرور-محور `/api/payment/callback` و صفحه درگاه نمایشی
  `/pay/demo/[authority]` با برچسب صریح؛ `PaymentEvent` برای همه نتایج.
- نهایی‌سازی اتمیک/idempotent واحد (`finalizeOrderPayment`/`finalizeInvoicePayment`)
  برای هر سه جریان پرداخت (سفارش/کارمزد آگهی/پلن).
- ماشین حالت‌های مرکزی (`state-machines.ts`) با `assertTransition` در همه اکشن‌ها.
- رزرو موجودی ۱۵ دقیقه (`StockReservation`) + انقضای cron؛ موجودی قابل خرید =
  stock − رزرو فعال؛ مصرف اتمیک تخفیف با گارد maxUses.
- مدل C2C: `Plan/Subscription/Invoice/PlatformRevenueEntry/LedgerEntry/PayoutRequest/
  SellerOrder/OrderEvent/ReturnRequest/Address/Notification/Setting/ShippingMethod`
  + enumهای دیتابیسی و ایندکس‌ها.
- سقف آگهی و کارمزد ثبت سمت سرور؛ جریان فاکتور کارمزد؛ بازگشت اعتباری در رد.
- شبه‌escrow سه‌مرحله‌ای (PENDING/HOLDING/CLEARED) + cron نگهداری.
- سفارش چندفروشنده (SellerOrder) با تقسیم نسبی تخفیف exact و کارمزد پلن‌محور.
- پیگیری مهمان (شماره سفارش + موبایل، rate-limited)؛ ادغام سبد مهمان در ورود.
- اعلان درون‌برنامه‌ای + شمارنده در هدر.
- نظرات DELIVERED-only با یک نظر برای هر خرید؛ پاسخ فروشنده و گزارش [Extra].
- آپلود امن تصویر (magic bytes + sharp/EXIF-strip + نام تصادفی) با دو adapter.
- مهاجرت کامل به App Router واقعی (۲۹ مسیر)، متادیتا/OG/JSON-LD/sitemap/robots،
  فیلتر/جستجو/مرتب/صفحه‌بندی سمت سرور، حذف loadAppData.
- حفاظت: rate limiter Postgres، CSP/HSTS/…، AUTH_SECRET اجباری، DEMO_MODE gate،
  admin:create، cron امن با CRON_SECRET، Caddy بدون XTransformPort.
- تست‌ها: ۳۰ unit + ۶ integration (رقابت واقعی) + E2E Playwright + smoke ۲۴چک + CI.
- مستندات: SCOPE/DECISIONS/SECURITY/ARCHITECTURE/PERFORMANCE/DEMO_ACCOUNTS/
  GO_LIVE_PAYMENT_CHECKLIST به‌روز.

### Fixed (باگ‌های شناخته‌شده سند)
- SOLD شرط `stock===0` (قبلاً `stock<=quantity` بعد از کاهش).
- verifyDemoPaymentAction حذف؛ نتیجه از کلاینت پذیرفته نمی‌شد.
- generateCode/slugify با crypto + retry روی P2002.
- استعلام اصالت تطبیق exact با پاسخ یکسان «نیست/رد شده».
- نرمال‌سازی مسیر تصویر (`..` ممنوع، وجود در کتابخانه/آپلود).
- ویرایش مادی اثر منتشرشده ⇒ بازگشت به بازبینی + باطل‌شدن رکورد اصالت.
- تسویه با ماشین حالت + PAID اتمیک (REJECTED→PAID و واریز دوباره بسته).
- rateLimit: Postgres، per-IP/per-account، بدون قفل سراسری.
- docker-compose بدون change-me؛ entrypoint فقط با DEMO_MODE می‌seed کند.
- ignoreBuildErrors=false؛ Caddy XTransformPort حذف؛ AUTH_SECRET fallback حذف.
- ریدایرکت callback روی origin درخواست (باگ پورت دمو).
