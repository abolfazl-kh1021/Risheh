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
  `db/` (SQLite), `risheh-source/` (extracted archive), logs, uploads.
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

Vercel:
1. Import the GitHub repo (framework auto-detected: Next.js).
2. Build command `bun run build` or default `next build`; install `bun install`.
3. Set env vars (Production + Preview) — see §3. At minimum `AUTH_SECRET` and a
   production `DATABASE_URL`.
4. Deploy → verify `/`, `#/categories/carpet`, `#/product/<id>`, `#/verify`,
   login + checkout smoke tests on the deployed URL.

**Run `bun run build` locally once before pushing** (see HANDOFF — it could not be
executed inside the sandbox while the dev server owns the port).

## 3. Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | ✅ | Prisma connection. SQLite for dev (`file:./db/custom.db`); use Postgres (Neon/Supabase/Vercel Postgres) for production |
| `AUTH_SECRET` | ✅ prod | HMAC secret for session cookie signing (`openssl rand -hex 32`) |
| `PAYMENT_*` (placeholder) | for real payments | Merchant/terminal/key of the chosen gateway (Zarinpal/Mellat/Zibal) |
| `SMS_*` (placeholder) | for OTP login | SMS provider API key + sender |
| `EMAIL_*` (placeholder) | for newsletter/contact email | Email provider key |

## 4. Persistence rules

- **Do not rely on local filesystem writes for production data.** SQLite (`file:`)
  is dev-only; on Vercel use a managed Postgres and run `prisma db push`/migrations
  from CI or locally against the remote DB.
- Uploads: no filesystem storage is used; a real upload feature must use an object
  store (S3-compatible / Vercel Blob) with validation.

## 5. Provider configuration checklist (when upgrading from demo)

| Capability | Demo state | Production requirement |
| --- | --- | --- |
| Payments | Labeled simulator (`DEMO` adapter, server-verified authority) | Real gateway SDK + server-to-server verify; callback URLs configured in the gateway panel; delete `verifyDemoPaymentAction` |
| OTP login | Tab visible with honest "not configured" notice | SMS provider; rate-limit persistence |
| Email/newsletter | Stored request, honest demo response | Email provider; template + domain verification |
| Uploads | Curated local library only | Object storage + type/size/malware validation |
| DB | SQLite file | Managed Postgres + migrations |

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
for fast, lockfile-exact dependency installation (`bun.lock`).

```bash
docker compose up -d --build      # → http://localhost:3000
docker compose logs -f web        # watch the boot
docker compose down -v            # stop + factory-reset the demo DB
```

Design decisions:

- **Baked demo DB**: the builder stage creates the schema (`prisma db push`) and
  seeds demo data (8 users / 58 artworks, password `risheh1403`); the pristine DB
  is stored at `/opt/seed-db` in the image. `docker/entrypoint.sh` materializes it
  into `/app/db` on first boot — so a `docker run` works out of the box, even from
  a fresh clone (`db/` is gitignored).
- **Persistence**: `docker-compose.yml` mounts the named volume `risheh-db` at
  `/app/db`. Bind-mount a host folder only if it is writable by uid 1001.
- **Non-root**: runtime runs as `appuser` (uid 1001); `openssl` + `ca-certificates`
  installed for the Prisma engine and outbound TLS.
- **Health**: `/api/health` (DB-free, auth-free) powers the Docker `HEALTHCHECK`,
  the Compose healthcheck and the CI smoke test.
- **Seed data self-contained**: seed JSONs live in `prisma/seed-data/` (committed),
  so seeding works from a fresh clone without the gitignored `risheh-source/` archive.
- `.dockerignore` excludes `.env*` (secrets never baked), `node_modules`, `db`,
  `docs`, sandbox artifacts — build context stays small and secret-free.
- Postgres swap path is pre-staged as a commented `db` service in Compose: change
  `provider` in `prisma/schema.prisma`, `bunx prisma db push`, set `DATABASE_URL`,
  remove the SQLite volume.

## 9. CI/CD — GitHub Actions (v0.10.0)

`.github/workflows/ci.yml` — triggers on every push to `main` and every PR:

| Job | Steps | Purpose |
| --- | --- | --- |
| `quality` | `bun install --frozen-lockfile` → `prisma generate` + local SQLite schema (`prisma db push` against `$RUNNER_TEMP`) → `lint` → `build` (with dummy `DATABASE_URL`/`AUTH_SECRET`) | Gates merges on a **verified production build** — the sandbox cannot run `next build` (dev server owns the port), so CI is the first place the build is proven |
| `docker` | Buildx build (GHA layer cache) → **smoke test**: `docker run` + poll `/api/health` up to 60 s → on pushes to `main`: publish to GHCR (`ghcr.io/<owner>/<repo>:latest` + `:sha-<sha>`, lowercase-normalized) | The Dockerfile itself is tested on every change; images are only published after lint/build/smoke all pass |

Notes:

- No external secrets required — GHCR publish uses the built-in
  `GITHUB_TOKEN` with `permissions: packages: write`.
- Concurrency group cancels superseded runs on the same ref.
- If a PR job fails, inspect the annotations in the PR checks tab; the smoke-test
  step dumps `docker logs` on failure for fast diagnosis.
