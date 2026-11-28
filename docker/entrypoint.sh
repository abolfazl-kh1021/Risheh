#!/bin/sh
# Risheh container entrypoint (PostgreSQL edition).
#
# On boot it:
#   1. waits for the database to accept connections,
#   2. applies pending Prisma migrations (`prisma migrate deploy`),
#   3. seeds the demo dataset ONLY when DEMO_MODE=true AND the users table
#      is empty — without DEMO_MODE nothing is ever seeded and no default
#      account exists (scope rule ۶/۱۰).
#   4. hands over to the CMD (Next.js standalone server).
#
# Admin accounts are NEVER seeded: create them with `bun run admin:create`
# (reads ADMIN_EMAIL/ADMIN_PASSWORD from env or prompts interactively).
set -e

PGBIN_WAIT="${DB_CONNECT_TIMEOUT:-60}"

echo "[entrypoint] waiting for PostgreSQL (max ${PGBIN_WAIT}s)…"
i=0
until bun -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.\$queryRaw\`SELECT 1\`.then(() => { console.log('db ready'); process.exit(0); }).catch(() => process.exit(1));
" 2>/dev/null; do
  i=$((i + 2))
  if [ "$i" -ge "$PGBIN_WAIT" ]; then
    echo "[entrypoint] ERROR: database not reachable after ${PGBIN_WAIT}s"
    exit 1
  fi
  sleep 2
done

echo "[entrypoint] applying Prisma migrations…"
prisma migrate deploy

if [ "$DEMO_MODE" = "true" ]; then
  echo "[entrypoint] DEMO_MODE=true — demo seed allowed"
  SEEDED=$(bun -e "
    const { PrismaClient } = require('@prisma/client');
    const p = new PrismaClient();
    p.user.count().then((n) => { console.log(n); return p.\$disconnect(); });
  ")
  if [ "$SEEDED" = "0" ]; then
    echo "[entrypoint] empty database — seeding DEMO data (labeled demo accounts)…"
    bun prisma/seed.ts
    echo "[entrypoint] demo data seeded (demo password: risheh1403 — DEMO ONLY)"
  else
    echo "[entrypoint] database already has ${SEEDED} users — skipping seed"
  fi
else
  echo "[entrypoint] DEMO_MODE not set — NO seed, NO default accounts. Create an admin with: bun run admin:create"
fi

exec "$@"
