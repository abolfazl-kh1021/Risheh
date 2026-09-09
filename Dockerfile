# syntax=docker/dockerfile:1

# =============================================================================
# Risheh — Persian handicrafts marketplace
# Multi-stage image: deps → build (with a freshly seeded demo DB) → slim runner.
# Runs the Next.js standalone output under Node 22 LTS (the battle-tested
# runtime for Next standalone + Prisma + sharp). Bun is used only where it
# shines: fast, lockfile-exact dependency installation (bun.lock).
# =============================================================================

# ---------- Stage 1: dependencies ----------
FROM node:22-bookworm-slim AS deps
RUN npm install -g bun@1 --no-fund --no-audit
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install

# ---------- Stage 2: build ----------
FROM node:22-bookworm-slim AS builder
RUN npm install -g bun@1 --no-fund --no-audit
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    DATABASE_URL=file:/app/db/custom.db

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client for the build, then a fresh demo database (schema + seed data)
# baked into the image, so a `docker run` works out of the box — even from a
# fresh GitHub clone that has no db/ directory (it is gitignored).
RUN bunx prisma generate \
 && mkdir -p db \
 && bunx prisma db push --accept-data-loss \
 && bun prisma/seed.ts \
 && bun run build

# ---------- Stage 3: runtime ----------
FROM node:22-bookworm-slim AS runner
# No apt-get needed: base image already ships ca-certificates and Prisma 6
# engines are statically linked — build works even if Debian mirrors are blocked.
RUN groupadd -g 1001 app \
 && useradd -r -u 1001 -g app -d /app appuser

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000 \
    DATABASE_URL=file:/app/db/custom.db

# Next standalone output (server.js + traced node_modules + .next/static +
# public — the build script already copied static & public into standalone).
COPY --from=builder --chown=appuser:app /app/.next/standalone ./

# Pristine seeded demo DB: materialized into /app/db by the entrypoint on
# first boot, so mounted volumes start with demo data.
COPY --from=builder /app/db /opt/seed-db
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh \
 && mkdir -p /app/db \
 && chown -R appuser:app /app/db

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]
