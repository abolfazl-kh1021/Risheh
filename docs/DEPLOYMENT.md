# DEPLOYMENT.md — GitHub & Vercel readiness

**Honest status:** since v0.10.0 the repo ships a working Docker setup
(`Dockerfile`, `docker-compose.yml`, entrypoint) and a GitHub Actions CI/CD
pipeline (`.github/workflows/ci.yml`) that runs lint + build + a container
smoke test on every push/PR and publishes the image to GHCR from `main`.
The Docker build itself cannot be executed inside this dev sandbox (no Docker
daemon); it is verified end-to-end by the CI `docker` job on the first GitHub
push. Creating the GitHub repository and any Vercel deployment remain user
actions (Phase 9 manual steps).

## 1. Repository hygiene (ready)

- `.gitignore` covers `.env*` (except `.env.example`), `node_modules`, `.next`,
  `db/` (legacy SQLite backup — migration source), `risheh-source/` (extracted archive), logs, uploads.
- `.env.example` documents every variable (see §3).
- Lockfile: `bun.lock` committed. Build command: standard Next.js (no custom output
  config required for Vercel).

## 2. Suggested Git / Vercel steps (user actions)

```bash
git init
git add -A
git commit -m "Risheh marketplace — fullstack demo build (phases 0-8)"
git branch -M main
git remote add origin git@github.com:<you>/risheh.git
git push -u origin main
```

Vercel (full Persian walkthrough incl. Neon + data migration: `docs/DEPLOY-POSTGRES-FA.md`):
1. Import the GitHub repo (framework auto-detected: Next.js).
2. Build command: `vercel-build` script handles `prisma generate && prisma migrate deploy && next build` (or set it manually).
3. Set env vars (Production + Preview) — see §3. At minimum `AUTH_SECRET`, `DATABASE_URL` (Neon pooled) and `DIRECT_DATABASE_URL` (Neon direct).
4. Deploy → verify `/`, `#/categories/carpet`, `#/product/<id>`, `#/verify`,
   login + checkout smoke tests on the deployed URL.

**Run `bun run build` locally once before pushing** (see HANDOFF — it could not be
executed inside the sandbox while the dev server owns the port).

## 3. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Prisma Client runtime connection — **Neon pooled** string (`-pooler` host, `pgbouncer=true`, serverless-safe params) |
| `DIRECT_DATABASE_URL` | ✅ | Prisma CLI only (`migrate deploy`, `db push`, `studio`) — **Neon direct** string (no `-pooler`) |
| `AUTH_SECRET` | ✅ prod | HMAC secret for session cookie signing (`openssl rand -hex 32`) |
| `PAYMENT_*` (placeholder) | for real payments | Merchant/terminal/key of the chosen gateway (Zarinpal/Mellat/Zibal) |
| `SMS_*` (placeholder) | for OTP login | SMS provider API key + sender |
| `EMAIL_*` (placeholder) | for newsletter/contact email | Email provider key |

## 4. Persistence rules

- **All persistent data lives in PostgreSQL (Neon).** Local dev points `DATABASE_URL` at any Postgres 16 instance (docker-compose `db` service or Neon). Schema changes go through Prisma migrations (`prisma migrate dev` locally, `prisma migrate deploy` on deploy).
- The legacy SQLite file (`db/custom.db`) is a read-only backup + source for the one-shot migration script (`scripts/migrate-sqlite-to-postgres.ts`). The app never touches it.
- Uploads: no filesystem storage is used; a real upload feature must use an object
  store (S3-compatible / Vercel Blob) with validation.

## 5. Provider configuration checklist (when upgrading from demo)

| Capability | Demo state | Production requirement |
| --- | --- | --- |
| Payments | Labeled simulator (`DEMO` adapter, server-verified authority) | Real gateway SDK + server-to-server verify; callback URLs configured in the gateway panel; delete `verifyDemoPaymentAction` |
| OTP login | Tab visible with honest "not configured" notice | SMS provider; rate-limit persistence |
| Email/newsletter | Stored request, honest demo response | Email provider; template + domain verification |
| Uploads | Curated local library only | Object storage + type/size/malware validation |
| DB | PostgreSQL (Neon) — migrated from SQLite | Managed Postgres + migrations (current state) |

## 6. SEO / metadata

- `layout.tsx`: fa/RTL metadata, OG tags, theme color, favicon (`public/assets/img/…`).
- Public pages are client-rendered under a single route in the sandbox — for SEO in a
  real deployment, split views into file routes (mechanical refactor, see
  `ARCHITECTURE.md` §2) and add `sitemap.ts` / `robots.ts`.
- Account/admin views should be `noindex` after the route split.

## 7. Rollback / redeploy

- Vercel: deployments are immutable — roll back from the dashboard (Deployments →
  … → Promote/Rollback). Keep DB migrations forward-compatible for one release
  before deleting columns/data.

## 8. Docker (v0.10.0)

Multi-stage `Dockerfile` (deps → build → slim runner). The production build runs
under **Node 22 LTS** with the Next.js **standalone** output; **Bun** is used only
for fast, lockfile-exact dependency installation (`bun.lock`). The container
connects to PostgreSQL through `DATABASE_URL` (compose `db` service or Neon).

```bash
docker compose up -d --build      # → http://localhost:3000 (with postgres:16 service)
docker compose logs -f web        # watch the boot: migrate deploy → seed → server
docker compose down -v            # stop + factory-reset the Postgres volume
```

Design decisions:

- **Boot-time migrations**: `docker/entrypoint.sh` waits for Postgres, runs
  `prisma migrate deploy`, seeds the demo dataset (8 users / 58 artworks, password
  `risheh1403`) only when the database is empty, then starts the server.
- **Persistence**: `docker-compose.yml` stores data in the named volume `risheh-pg`
  attached to the `db` service. Point `DATABASE_URL`/`DIRECT_DATABASE_URL` at Neon
  to run the web container without the local `db` service.
- **Non-root**: runtime runs as `appuser` (uid 1001); `openssl` + `ca-certificates`
  installed for the Prisma engine and outbound TLS.
- **Health**: `/api/health` (DB-free, auth-free) powers the Docker `HEALTHCHECK`,
  the Compose healthcheck and the CI smoke test.
- **Seed data self-contained**: seed JSONs live in `prisma/seed-data/` (committed),
  so seeding works from a fresh clone without the gitignored `risheh-source/` archive.
- `.dockerignore` excludes `.env*` (secrets never baked), `node_modules`, `db`,
  `docs`, sandbox artifacts — build context stays small and secret-free.
- Postgres swap is done — the compose file ships an active `postgres:16` service
  and the schema is `postgresql` with pooled/direct URL split (`schema.prisma`).

## 9. CI/CD — GitHub Actions (v0.10.0)

`.github/workflows/ci.yml` — triggers on every push to `main` and every PR:

| Job | Steps | Purpose |
| --- | --- | --- |
| `quality` | `bun install --frozen-lockfile` → `prisma generate` + `prisma migrate deploy` against a **Postgres 16 service container** → `lint` → `build` | Gates merges on a **verified production build** — the sandbox cannot run `next build` (dev server owns the port), so CI is the first place the build is proven |
| `docker` | Buildx build (GHA layer cache) → **smoke test**: `docker run` + poll `/api/health` up to 60 s → on pushes to `main`: publish to GHCR (`ghcr.io/<owner>/<repo>:latest` + `:sha-<sha>`, lowercase-normalized) | The Dockerfile itself is tested on every change; images are only published after lint/build/smoke all pass |

Notes:

- No external secrets required — GHCR publish uses the built-in
  `GITHUB_TOKEN` with `permissions: packages: write`.
- Concurrency group cancels superseded runs on the same ref.
- If a PR job fails, inspect the annotations in the PR checks tab; the smoke-test
  step dumps `docker logs` on failure for fast diagnosis.
