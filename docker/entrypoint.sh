#!/bin/sh
# Risheh container entrypoint.
# Materializes the pristine seeded demo DB into the runtime DB path on first
# boot, then hands over to the CMD (Next.js standalone server).
set -e

DB_FILE="${DATABASE_URL#file:}"

if [ ! -f "$DB_FILE" ]; then
  echo "[entrypoint] no database at $DB_FILE — restoring pristine seeded demo DB"
  mkdir -p "$(dirname "$DB_FILE")"
  if [ -f /opt/seed-db/custom.db ]; then
    cp /opt/seed-db/custom.db "$DB_FILE"
    echo "[entrypoint] demo database restored (8 users / 58 artworks, password: risheh1403)"
  else
    echo "[entrypoint] WARNING: no pristine seed DB found in image; starting with an empty DB"
    touch "$DB_FILE"
  fi
fi

exec "$@"
