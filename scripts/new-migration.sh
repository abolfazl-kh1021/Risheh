#!/usr/bin/env bash
# Additive migration generator: diffs the live DB against schema.prisma and
# creates prisma/migrations/<ts>_<name>/migration.sql, then applies it.
# Usage: bash scripts/new-migration.sh <name>
set -euo pipefail
cd "$(dirname "$0")/.."
NAME="$1"
unset DATABASE_URL DIRECT_DATABASE_URL
TS="$(date +%Y%m%d%H%M%S)"
DIR="prisma/migrations/${TS}_${NAME}"
mkdir -p "$DIR"
# Prisma CLI needs env vars pointing at the DIRECT url for diffing
export DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2- | tr -d '"')"
export DIRECT_DATABASE_URL="$DATABASE_URL"
bunx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script > "$DIR/migration.sql"
if [ ! -s "$DIR/migration.sql" ]; then
  echo "No schema changes detected — removing empty migration."
  rm -rf "$DIR"
  exit 0
fi
echo "--- migration SQL ($DIR) ---"
cat "$DIR/migration.sql"
bunx prisma migrate deploy
bunx prisma generate
echo "OK"
