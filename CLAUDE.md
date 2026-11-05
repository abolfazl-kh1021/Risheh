# CLAUDE.md — Risheh (ریشه)

**Persian-first RTL marketplace for authentic Iranian handicrafts — fullstack Next.js build.**

## Start here (every new session)

Read, in order, before touching code:

1. `docs/PROGRESS.md` — current phase, what is done, what is in flight
2. `docs/HANDOFF.md` — exact next actions, commands, blockers
3. `docs/ARCHITECTURE.md` — how the app is structured (single-route SPA + Server Actions)
4. `docs/DESIGN_SYSTEM.md` — the visual contract (do not redesign)
5. `docs/DECISIONS.md` — why things are the way they are

Then inspect the repository itself. Do not restart completed phases, do not change the
design language, and do not change architecture without writing the reason into
`docs/DECISIONS.md` first.

## What this project is

- **Product:** Risheh — a marketplace for discovering, buying, selling and
  authenticity-verifying Iranian art and handicrafts. Customer experience is Persian
  (fa) and RTL.
- **Original design:** the supplied HTML archive (16 pages, "Persian Luxury Heritage"
  design system) is the visual source of truth. Preserved, not reinvented. Extracted
  tokens live in `src/app/globals.css`.
- **Original contract documents:** `docs/reference/CLAUDE_MASTER_PROMPT.md`,
  `docs/reference/RISHEH_PROJECT_GUIDE.md`, `docs/reference/RISHEH_PHASE_PROMPTS.md`.

## Non-negotiable rules

1. **Preserve the design.** Colors/typography/spacing come from the original archive
   (see `docs/DESIGN_SYSTEM.md`). No generic template substitution.
2. **No fake functionality.** Never fake a payment, shipment, settlement, or
   authenticity verdict. Demo/simulated behavior must be visibly labeled
   («نمایشی», «شبیه‌سازی — پول واقعی جابه‌جا نمی‌شود»).
3. **Server-side authorization everywhere.** Role and ownership checks live in
   `src/lib/actions/*` (never in the client). Client role values are never trusted.
4. **Server-side totals.** Order totals, prices and stock are recomputed on the server
   (`src/lib/actions/orders.ts`, `createOrderAction`). Client totals are display-only.
5. **Secrets stay out of Git.** `.env` is git-ignored; `.env.example` documents names.
6. **Update continuity docs at the end of every session** (`PROGRESS.md`, `HANDOFF.md`,
   `CHANGELOG.md` and any affected specialist doc).

## Commands

```bash
bun run dev        # dev server on :3000 (auto-run by the sandbox; do not start manually)
bun run lint       # ESLint (must pass with 0 errors)
bun run db:push    # apply prisma/schema.prisma to the SQLite DB
bun prisma/seed.ts # (re)seed demo data — destroys existing rows
```

The app is served as a **single route** (`/`) in this sandbox preview; all views are
hash-routed inside it (`#/home`, `#/product/<id>`, `#/admin`, …). See
`docs/ARCHITECTURE.md` before adding views.

## Demo accounts (seeded, password `risheh1403`)

| Role | Email |
| --- | --- |
| Buyer | `buyer@risheh.ir` |
| Artisan | `artisan@risheh.ir` |
| Admin | `admin@risheh.ir` |

These are demo credentials, shown in the UI on the login page, safe for the demo build.
