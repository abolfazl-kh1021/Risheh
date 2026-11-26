# syntax=docker/dockerfile:1

# =============================================================================
# Risheh — Persian handicrafts marketplace
# Multi-stage image: deps → build → slim runner.
# PostgreSQL edition: the container connects to a Postgres server through
# DATABASE_URL (docker-compose service or a managed database like Neon).
# The runner ships bun + the Prisma CLI so the entrypoint can run
# `prisma migrate deploy` and the demo seed on first boot.
#
# FIXES vs. previous version:
#   1. deps stage now copies prisma/schema.prisma BEFORE `bun install`,
#      because the root `postinstall` script runs `prisma generate`,
#      which cannot work without the schema file
#      ("Error: Could not find Prisma Schema").
#   2. `openssl` is installed in all three stages. node:22-bookworm-slim
#      ships no openssl binary, so Prisma cannot detect the libssl version
#      and falls back to the openssl-1.1.x engine, which cannot load on
#      Debian 12 (bookworm only has libssl3) → install openssl so Prisma
#      selects the debian-openssl-3.0.x engine.
# =============================================================================

# ---------- Stage 1: dependencies ----------
FROM node:22-bookworm-slim AS deps
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g bun@1 --no-fund --no-audit
WORKDIR /app
COPY package.json bun.lock ./
# `bun install` triggers postinstall = `prisma generate` → needs the schema
COPY prisma/schema.prisma ./prisma/schema.prisma
RUN bun install

# ---------- Stage 2: build ----------
FROM node:22-bookworm-slim AS builder
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && npm install -g bun@1 --no-fund --no-audit
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    # Dummy URLs: `prisma generate` does not connect to the database, and the
    # Next.js build only needs the env vars to EXIST for Prisma to resolve
    # the datasource (no queries run at build time in this app).
    DATABASE_URL=postgresql://build:build@localhost:5432/build?sslmode=disable \
    DIRECT_DATABASE_URL=postgresql://build:build@localhost:5432/build?sslmode=disable

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Prisma client + production build (the `build` script also copies
# .next/static and public into the standalone output for the runner).
RUN bun run build

# ---------- Stage 3: runtime ----------
FROM node:22-bookworm-slim AS runner
RUN apt-get update -y \
 && apt-get install -y --no-install-recommends openssl \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 1001 app \
 && useradd -r -u 1001 -g app -d /app appuser \
 # bun + prisma CLI: the entrypoint runs `migrate deploy` and the seed at boot
 && npm install -g bun@1 --no-fund --no-audit

WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    HOSTNAME=0.0.0.0 \
    PORT=3000

# Next standalone output (server.js + traced node_modules + .next/static +
# public — the build script already copied static & public into standalone).
COPY --from=builder --chown=appuser:app /app/.next/standalone ./

# Prisma schema + seed + prisma CLI for `migrate deploy` at boot.
COPY --from=builder --chown=appuser:app /app/prisma ./prisma
COPY --from=builder --chown=appuser:app /app/node_modules/prisma ./node_modules/prisma
COPY --from=builder --chown=appuser:app /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder --chown=appuser:app /app/node_modules/.bin ./node_modules/.bin
COPY docker/entrypoint.sh /usr/local/bin/entrypoint.sh

RUN chmod +x /usr/local/bin/entrypoint.sh \
 && chown -R appuser:app /app

USER appuser
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "server.js"]