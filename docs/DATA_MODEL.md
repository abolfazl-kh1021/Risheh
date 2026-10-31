# DATA_MODEL.md

Prisma schema: `prisma/schema.prisma` (SQLite; portable to Postgres). Seed:
`prisma/seed.ts` (`bun prisma/seed.ts` — destructive reset + demo data).

## Entities overview

| Model | Purpose | Key fields / relations |
| --- | --- | --- |
| `User` | buyer/artisan/admin account | `role` (BUYER/ARTISAN/ADMIN), `passwordHash` (scrypt salt:hash), artisan profile (`shopTitle`, `province`, `bio`, `avatar`, `planId`, `verified`) |
| `Session` | server-side auth sessions | `token` (hashed-cookie ref), `expiresAt` |
| `Category` | 8 craft categories | `slug`, `title`, `tagline`, `image`, `order` |
| `Artwork` | product/seller work | `code` (RSH-XXXXX), `price` (Toman int), `compareAtPrice`, `images` (JSON array), `sizes`/`colors` (JSON), `status` (DRAFT/PENDING/PUBLISHED/REJECTED/ARCHIVED/SOLD), `stock`, `rating(+Count)`, `sellerId`, `categoryId` |
| `Review` | buyer reviews | rating 1–5 + comment |
| `Favorite` | wishlist | unique (userId, artworkId) |
| `AuthenticityRecord` | 1:1 with artwork | `hologramCode` (unique), `status` (VERIFIED/PENDING/REJECTED), `labStatus` (QUEUED/IN_LAB/TESTS_DONE/ISSUED), `tests` JSON, `inspector`, `issuedAt` |
| `VerificationEvent` | audit trail per record | actor, action, detail |
| `LabRequest` | artisan → lab (sample send / photo session) | `kind`, `preferredDate`, `status` |
| `CartItem` | server-side cart | `userId` **or** `guestKey`, `quantity` ≤ stock/10, `variant` JSON |
| `Order` | purchase | `orderNumber` (RSH-ORD-…), buyer snapshot (`buyerName/Phone/Address/City/PostalCode/Note`), server-computed `subtotal/discount/shipping/total`, `status` |
| `OrderItem` | immutable line snapshot | `titleSnapshot`, `imageSnapshot`, `unitPrice` (server-verified), `sellerId` |
| `PaymentAttempt` | gateway attempts | `gateway` (DEMO), `authority` (server-issued, unique), `status` (PENDING/SUCCESS/FAILED/CANCELLED), `refNumber`, `verifiedAt` |
| `TrackingEvent` | shipment timeline | status, detail, actor |
| `LedgerEntry` | seller money ledger | `kind` (SALE/COMMISSION/PAYOUT/SUBSCRIPTION), `amount` (+credit/−debit), `status` (CLEARED/PENDING) |
| `SettlementRequest` | seller payout request | `amount`, `iban` (IR+24 validated), `status` (PENDING/APPROVED/PAID/REJECTED), `adminNote` |
| `BlogPost` | magazine articles | slug, title, excerpt, content, author, category, readTime |
| `ContactMessage` | support inbox | name, email, subject, message, `handled` |
| `SubscriptionPlan` | admin membership plans | bronze/silver/gold/national (from source data) |
| `MemberRequest` | artisan join flow | workshop, province, portfolio, `planId`, status |
| `AuditLog` | privileged action log | actor, action, target, detail |

## Money rules

- Currency: **Toman**, integer, no decimals (matches source content).
- Derived values (commission 10%, balances, available-for-settlement) are computed
  **server-side from LedgerEntry rows** at request time; never stored twice.
- Order totals recomputed from DB prices at `createOrderAction` time; OrderItem
  snapshots freeze what was actually purchased.

## Integrity & indexes

- Stable cuid IDs; business codes (`RSH-…`, hologram) unique-indexed.
- FK behavior: cascade deletes for owned children (cart, reviews, favorites,
  tracking, payment attempts); orders keep snapshots after artwork changes.
- Indexes: `sessions.token`, `cart_items.userId/guestKey`, `artworks.sellerId/
  categoryId/status`, `orders.buyerId`, `order_items.orderId/sellerId`,
  `payment_attempts.orderId`, `ledger_entries.sellerId`, `audit_logs.createdAt`.
- SQLite has no enums → statuses are constrained strings validated by Zod in actions.

## Seed data (clearly labeled demo)

- 8 users (3 demo logins + 5 artisans), 8 categories, 58 artworks (8×6 catalog +
  5 home-featured + hero rug + 5 artisan-owned with mixed statuses),
  58 authenticity records (VERIFIED/PENDING), 7 blog posts, 4 plans, sample order
  (PAID) + tracking + ledger, guest-visible demo cart, settlement + lab requests,
  contact messages, audit entries. Source: `risheh-source/refs/catalog.json`
  (extracted verbatim from `categories.html`) + page text references.
