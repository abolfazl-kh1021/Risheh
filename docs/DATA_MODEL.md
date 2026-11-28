# DATA_MODEL.md — مدل داده C2C (پس از بازنویسی)

## نمودار موجودیت‌ها

```
User(role: BUYER|ARTISAN|ADMIN, slug, iban, suspended)
 ├─ Session[] ─ (token, ip, ua, expiresAt)
 ├─ Artwork[] ─ (code, slug, price, stock, status: ListingStatus,
 │               publishedAt, expiresAt, reviewNote, deletedAt)
 │    ├─ AuthenticityRecord 1─1 (hologramCode, status, labStatus, tests)
 │    ├─ Review[] (orderItemId UNIQUE ← یک نظر برای هر خرید DELIVERED)
 │    ├─ StockReservation[] (status: ACTIVE→CONVERTED|RELEASED|EXPIRED)
 │    └─ Invoice[] (kind=LISTING_FEE)
 ├─ Order[] ── (orderNumber, buyerPhone, guestKey, shippingMethodId,
 │    │        status: OrderStatus, totals همه سرور-محاسبه)
 │    ├─ OrderItem[] (snapshot قیمت/عنوان، sellerOrderId)
 │    ├─ SellerOrder[] UNIQUE(orderId,sellerId) ─ (gross, discountShare,
 │    │      net, commission, shippingShare, status: SellerOrderStatus)
 │    ├─ OrderEvent[] (تایم‌لاین: STATUS|PAYMENT|RETURN)
 │    ├─ PaymentAttempt[] (provider, authority UNIQUE, demoOutcome)
 │    │      └─ PaymentEvent[] (REQUESTED/CALLBACK/VERIFY_*)
 │    ├─ StockReservation[]
 │    └─ Invoice[] (kind=ORDER)
 ├─ Address[] (دفترچه، deletedAt نرم)
 ├─ Notification[] (readAt)
 ├─ MemberRequest 1─1 (تایید عضویت → verified=true)
 ├─ Subscription[] → Plan (ACTIVE واحد منطقی)
 ├─ LedgerEntry[] (kind: SALE|COMMISSION|PAYOUT|LISTING_FEE_REFUND|ADJUSTMENT,
 │      status: PENDING→HOLDING→CLEARED, availableAt)
 ├─ PayoutRequest[] (PENDING→APPROVED→PAID|REJECTED، reference)
 ├─ ReturnRequest[] (PENDING→APPROVED→RECEIVED→REFUNDED)
 └─ Invoice[] (payer)

Plan (free|bronze|silver|gold) ─ (priceToman, periodDays,
     maxActiveListings?, listingFeeToman, commissionBps, features)

PlatformRevenueEntry (kind: LISTING_FEE|SUBSCRIPTION|COMMISSION, amount≥0)
     ← در پایان موفق هر جریان پرداخت نوشته می‌شود

DiscountCampaign → DiscountCode → DiscountRedemption (CLAIMED|APPLIED)
     DiscountArtwork (پین آثار کمپین)

Setting (کلید/مقدار: LISTING_ACTIVE_DAYS, RETENTION_DAYS, …)
ShippingMethod (free|courier|tipax — از DB)
RateLimitBucket (key UNIQUE, count, resetAt)
BlogPost / ContactMessage / AuditLog / LabRequest / VerificationEvent
Favorite / CartItem (userId یا guestKey)
```

## قواعد کلیدی

1. **پول integer تومان**؛ تقسیم نسبی با largest-remainder (`lib/money.ts`).
2. **وضعیت‌ها enum دیتابیسی**؛ هر گذار از `assertTransition`.
3. **حذف نرم** (`deletedAt`) برای داده‌های audited؛ Order با SetNull به buyer.
4. **موجودی قابل خرید** = `stock − Σ ACTIVE reservations`.
5. **یک Subscription ACTIVE به‌ازای فروشنده** (منطق + cron downgrade بایگانی مازاد).
6. **Accounting invariant:** Σ(SellerOrder.net) = order.total؛
   Σ(SALE) + Σ(COMMISSION) = total − platform commission.
