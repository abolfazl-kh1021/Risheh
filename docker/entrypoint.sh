#!/bin/sh
# Risheh container entrypoint (PostgreSQL edition).
#
# The web container no longer owns a SQLite file — it connects to a Postgres
# server via DATABASE_URL (docker-compose provides one, or point it at Neon).
# On boot it:
#   1. waits for the database to accept connections,
#   2. applies pending Prisma migrations (`prisma migrate deploy`),
#   3. seeds the demo dataset exactly once (empty users table → seed),
#   4. hands over to the CMD (Next.js standalone server).
#
# CHANGE: `bunx prisma migrate deploy` → `prisma migrate deploy`.
# The Prisma CLI is now installed globally in the image (with its full
# dependency tree — see Dockerfile). `bunx prisma` would first look into
# ./node_modules/.bin (no longer copied) and otherwise try to DOWNLOAD
# prisma at container boot — never rely on the network at boot time.
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

# Seed once: only when the database is completely empty (fresh volume).
SEEDED=$(bun -e "
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  p.user.count().then((n) => { console.log(n); return p.\$disconnect(); });
")
if [ "$SEEDED" = "0" ]; then
  echo "[entrypoint] empty database detected — seeding demo data…"
  bun prisma/seed.ts
  echo "[entrypoint] demo data seeded (8 users / 58 artworks, password: risheh1403)"
else
  echo "[entrypoint] database already has ${SEEDED} users — skipping seed"
fi

exec "$@"
