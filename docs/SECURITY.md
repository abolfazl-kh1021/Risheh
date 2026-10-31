# SECURITY.md

**Build status: demo/development.** The controls below are implemented and verified;
the explicitly-marked gaps are the ones that require real providers or production
infrastructure. No compliance claims are made.

## 1. Authentication (demo adapter — clearly labeled)

- Passwords hashed with **scrypt** (64-byte, per-user random salt) via node:crypto;
  plaintext never stored or logged. `verifyPassword` uses `timingSafeEqual`.
- Sessions: 256-bit random tokens stored server-side (`Session` table); cookie
  `risheh_session` is **httpOnly, SameSite=Lax, Secure in production**, signed with
  HMAC-SHA256 (`AUTH_SECRET`) so a forged cookie value fails validation.
- Expiry: 14 days; expired sessions are deleted on read.
- Demo credentials (`risheh1403`) are published in the UI — acceptable **only**
  because this is a labeled demo build; rotate/remove for production.
- **Gap:** no password reset (no email provider), no MFA, no NextAuth — documented.

## 2. Authorization (server-enforced)

- Every Server Action calls `getCurrentUser()` and re-checks role/ownership:
  - Artwork create/update/status/lab requests: `sellerId === user.id || ADMIN`.
  - Order status transitions: seller of the order items or ADMIN, plus a validated
    transition map (`ALLOWED_TRANSITIONS`) — invalid transitions are rejected.
  - Settlements: artisan-only; amount validated against ledger balance server-side.
  - Admin actions (`decideMemberRequestAction`, `decideArtworkVerificationAction`,
    `updateLabStatusAction`, `decideSettlementAction`, `markMessageHandledAction`):
    `requireAdmin()` gate.
- Client-visible roles/badges are cosmetic only.

## 3. Input validation

- All actions validate input with **Zod** (lengths, regexes, Persian-digit
  normalization for phone/IBAN/codes) and return structured errors.
- Order totals: recomputed server-side; client totals ignored. Stock checked at
  add-to-cart, order creation, and payment success (decrement).
- Payment verification is idempotent (`authority` unique; PENDING-only transitions).

## 4. Payment data

- **No card numbers, CVV, or banking credentials are collected or stored anywhere.**
- The demo gateway is a labeled simulation; real gateway integration must happen
  server-side (server-to-server verification), never via client redirect params.

## 5. Injection & XSS

- All DB access via Prisma parameterized queries (no raw SQL string building).
- React escapes output by default; no `dangerouslySetInnerHTML` anywhere in the app.
- User-entered strings rendered as text nodes only.

## 6. Uploads

- **File uploads are not implemented** (no storage provider in the sandbox). The
  artwork editor uses a curated local image library restricted to `/assets/img/…`
  paths (enforced in the action: non-matching paths rejected). Real uploads require
  type/size/content validation + malware scanning + provider config — documented in
  DEPLOYMENT.md.

## 7. Rate limiting / abuse

- In-memory fixed-window limiter (`rateLimit`): login 15/min, register 10/min,
  contact 5/5min, newsletter 10/5min, verification 30/min, settlements 5/min per user.
- **Gap:** in-memory limiter resets per instance; use Redis/persistent store for prod.
- Contact form stores messages for admin triage (no auto-email is claimed).

## 8. Secrets

- `.env` git-ignored; `.env.example` documents `AUTH_SECRET` + placeholder provider
  keys. No secret values committed. Demo `AUTH_SECRET` fallback exists only for the
  sandbox and is documented as "do not use in production".

## 9. Logging & privacy

- Logs (dev) contain Prisma query traces — no user passwords (hashes only) and no
  payment credentials (none exist).
- Contact messages keep name/email/message (user-provided), visible only to ADMIN.
- No analytics/tracking scripts.

## 10. Sessions & CSRF

- Cookie is SameSite=Lax + same-origin Server Actions → CSRF surface minimal.
  Server Actions in Next.js include origin checks by default.
- **Gap:** explicit CSRF token layer not added (documented decision D7).

## 11. Admin destructive actions

- Settlement "PAID", artwork rejection, and member rejection are explicit server
  actions with audit rows; UI asks for confirmation only on irreversible artwork
  archive (archive keeps data — reversible). Payment simulation cannot be repeated
  (idempotent authority).

## 12. Before production (checklist)

- [ ] Set strong `AUTH_SECRET`; remove demo accounts from UI/seed.
- [ ] Replace SQLite with Postgres; enable backups.
- [ ] Integrate a real gateway + server-to-server verification; delete the demo adapter.
- [ ] Integrate SMS/OTP + email providers.
- [ ] Implement real uploads with validation/scanning + CDN.
- [ ] Persistent rate limiting (Redis) + WAF/basic DDoS protection.
- [ ] Review Vercel region/logging; add structured logging without PII.
