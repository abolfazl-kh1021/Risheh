/**
 * ============================================================================
 * Risheh — one-shot data migration: SQLite → PostgreSQL (Neon)
 * ============================================================================
 *
 * Copies EVERY row from the legacy SQLite database (db/custom.db) into the
 * PostgreSQL database configured via DATABASE_URL / DIRECT_DATABASE_URL.
 *
 * What it does:
 *   1. Reads all 21 tables from db/custom.db (node:sqlite, read-only).
 *   2. Converts SQLite storage formats:
 *        • DateTime  epoch-millis INTEGER → ISO Date objects
 *        • Boolean   0/1 INTEGER          → true/false
 *        • NULL      → omitted (nullable columns stay NULL, defaulted columns
 *                      get the Prisma default — identical to the old rows).
 *   3. Deletes existing Postgres rows in reverse dependency order, then
 *      inserts everything in dependency order — ALL inside ONE atomic
 *      transaction. Re-running the script is safe (idempotent).
 *   4. Runs ANALYZE so the Postgres query planner has fresh statistics.
 *   5. Verifies row counts per table (SQLite vs PostgreSQL) and exits
 *      non-zero on any mismatch.
 *
 * Usage:
 *   # 1. Put your Neon connection strings into .env first (see docs/DEPLOY-POSTGRES-FA.md)
 *   # 2. Run the migration (Node 22+ runs TypeScript natively):
 *   node scripts/migrate-sqlite-to-postgres.ts
 *
 *   # Preview without writing anything:
 *   DRY_RUN=1 node scripts/migrate-sqlite-to-postgres.ts
 * ============================================================================
 */

import { DatabaseSync } from "node:sqlite";
import * as path from "node:path";
import * as fs from "node:fs";
import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const SQLITE_PATH = process.env.SQLITE_PATH
  ?? path.join(process.cwd(), "db", "custom.db");

const TARGET_URL = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

const DRY_RUN = process.env.DRY_RUN === "1";

if (!TARGET_URL || TARGET_URL.startsWith("file:")) {
  console.error(
    "\n[migrate] ERROR: no PostgreSQL target configured.\n" +
    "  Set DATABASE_URL (and DIRECT_DATABASE_URL) in .env to your Neon\n" +
    "  connection strings first — see docs/DEPLOY-POSTGRES-FA.md.\n"
  );
  process.exit(1);
}

if (!fs.existsSync(SQLITE_PATH)) {
  console.error(`\n[migrate] ERROR: SQLite source not found: ${SQLITE_PATH}\n`);
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Table specs — insertion order respects every foreign key in schema.prisma
// ---------------------------------------------------------------------------

type TableSpec = {
  /** SQLite / Postgres table name (snake_case @@map name). */
  table: string;
  /** Prisma delegate name (camelCase model). */
  model: string;
  /** Columns Prisma stored as epoch-millis INTEGER in SQLite. */
  dates?: string[];
  /** Columns Prisma stored as 0/1 INTEGER in SQLite. */
  bools?: string[];
};

const TABLES: TableSpec[] = [
  { table: "users",                model: "user",              dates: ["createdAt", "updatedAt"], bools: ["verified"] },
  { table: "categories",           model: "category" },
  { table: "subscription_plans",   model: "subscriptionPlan",  bools: ["highlight"] },
  { table: "artworks",             model: "artwork",           dates: ["createdAt", "updatedAt"], bools: ["featured"] },
  { table: "sessions",             model: "session",           dates: ["expiresAt", "createdAt"] },
  { table: "authenticity_records", model: "authenticityRecord", dates: ["issuedAt", "createdAt", "updatedAt"] },
  { table: "verification_events",  model: "verificationEvent", dates: ["createdAt"] },
  { table: "lab_requests",         model: "labRequest",        dates: ["createdAt"] },
  { table: "reviews",              model: "review",            dates: ["createdAt"] },
  { table: "favorites",            model: "favorite",          dates: ["createdAt"] },
  { table: "cart_items",           model: "cartItem",          dates: ["createdAt"] },
  { table: "orders",               model: "order",             dates: ["createdAt", "updatedAt"] },
  { table: "order_items",          model: "orderItem" },
  { table: "payment_attempts",     model: "paymentAttempt",    dates: ["createdAt", "verifiedAt"] },
  { table: "tracking_events",      model: "trackingEvent",     dates: ["createdAt"] },
  { table: "ledger_entries",       model: "ledgerEntry",       dates: ["createdAt"] },
  { table: "settlement_requests",  model: "settlementRequest", dates: ["createdAt", "decidedAt"] },
  { table: "blog_posts",           model: "blogPost",          dates: ["createdAt"], bools: ["featured"] },
  { table: "contact_messages",     model: "contactMessage",    dates: ["createdAt"], bools: ["handled"] },
  { table: "member_requests",      model: "memberRequest",     dates: ["createdAt", "decidedAt"] },
  { table: "audit_logs",           model: "auditLog",          dates: ["createdAt"] },
  { table: "discount_campaigns",   model: "discountCampaign",  dates: ["startsAt", "endsAt", "createdAt"], bools: ["active"] },
  { table: "discount_codes",       model: "discountCode",      dates: ["startsAt", "expiresAt", "createdAt"], bools: ["active"] },
  { table: "discount_redemptions", model: "discountRedemption", dates: ["createdAt"] },
  { table: "discount_artworks",    model: "discountArtwork",   dates: ["createdAt"] },
];

// ---------------------------------------------------------------------------
// SQLite reading + value conversion
// ---------------------------------------------------------------------------

const sqlite = new DatabaseSync(SQLITE_PATH, { readOnly: true });

const SQLITE_TABLES = new Set(
  (sqlite
    .prepare("SELECT name FROM sqlite_master WHERE type='table'")
    .all() as Array<{ name: string }>)
    .map((r) => r.name)
);

function readTable(table: string): Record<string, unknown>[] {
  // The legacy SQLite file predates the discount-campaign feature — its four
  // tables were added to the schema after the last `db push`. They simply
  // start empty in PostgreSQL (the app will create them through the UI).
  if (!SQLITE_TABLES.has(table)) {
    console.log(`  note: SQLite has no "${table}" table (newer schema) — starting empty in PostgreSQL`);
    return [];
  }
  return sqlite.prepare(`SELECT * FROM "${table}"`).all() as Record<string, unknown>[];
}

function convertRow(row: Record<string, unknown>, spec: TableSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(row)) {
    // NULL: let nullable columns stay NULL and defaulted columns take the
    // Prisma schema default — matches what the old rows actually held.
    if (value === null) continue;
    if (spec.dates?.includes(key)) {
      // Prisma stores SQLite DateTime as epoch-millis INTEGER; some very old
      // rows could be ISO strings — handle both defensively.
      out[key] =
        typeof value === "number" ? new Date(value)
        : typeof value === "string" && /^\d+$/.test(value) ? new Date(Number(value))
        : new Date(String(value));
      if (Number.isNaN((out[key] as Date).getTime())) {
        throw new Error(`[${spec.table}] invalid date in column "${key}": ${String(value)}`);
      }
    } else if (spec.bools?.includes(key)) {
      out[key] = value === 1 || value === true || value === "1";
    } else {
      out[key] = value;
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Prisma target
// ---------------------------------------------------------------------------

/** Prisma client bound to the TARGET Postgres URL (direct connection preferred). */
const prisma = new PrismaClient({
  datasourceUrl: TARGET_URL,
});

type AnyDelegate = {
  createMany(args: { data: Record<string, unknown>[] }): Promise<{ count: number }>;
  deleteMany(args?: { where?: Record<string, unknown> }): Promise<{ count: number }>;
  count(): Promise<number>;
};

function delegate(name: string): AnyDelegate {
  const d = (prisma as unknown as Record<string, AnyDelegate | undefined>)[name];
  if (!d) throw new Error(`Unknown Prisma model delegate: ${name}`);
  return d;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   Risheh data migration:  SQLite → PostgreSQL            ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log(`  source : ${SQLITE_PATH}`);
  console.log(`  target : ${TARGET_URL.replace(/:[^:@/]+@/, ":•••@")}`);
  if (DRY_RUN) console.log("  mode   : DRY RUN (nothing will be written)\n");

  // Connectivity check up-front (fast, clear failure)
  await prisma.$queryRaw`SELECT 1`;
  console.log("  target reachable ✓\n");

  // Pre-read everything from SQLite and convert BEFORE opening the
  // transaction, so conversion errors can never leave a half-applied state.
  const payloads = new Map<string, Record<string, unknown>[]>();
  let totalRows = 0;
  for (const spec of TABLES) {
    const rows = readTable(spec.table).map((r) => convertRow(r, spec));
    payloads.set(spec.table, rows);
    totalRows += rows.length;
    console.log(`  read ${spec.table.padEnd(22)} ${String(rows.length).padStart(5)} rows`);
  }
  console.log(`  ----------------------------------------------`);
  console.log(`  total ${totalRows} rows ready for import\n`);

  if (DRY_RUN) {
    console.log("  DRY RUN finished — no data was written. Remove DRY_RUN=1 to import.");
    return;
  }

  // Atomic import: wipe (children first) → insert (parents first).
  const inserted = await prisma.$transaction(
    async (tx) => {
      const counts: Record<string, number> = {};
      // 1) delete in REVERSE dependency order — safe re-runs, no FK violations
      for (const spec of [...TABLES].reverse()) {
        const del = (tx as unknown as Record<string, AnyDelegate>)[spec.model];
        await del.deleteMany({});
      }
      // 2) insert in dependency order
      for (const spec of TABLES) {
        const rows = payloads.get(spec.table) ?? [];
        if (rows.length === 0) continue;
        const del = (tx as unknown as Record<string, AnyDelegate>)[spec.model];
        try {
          const res = await del.createMany({ data: rows });
          counts[spec.table] = res.count;
        } catch (error) {
          throw new Error(
            `[${spec.table}] import failed — ${(error instanceof Error ? error.message : String(error))}`
          );
        }
      }
      return counts;
    },
    { maxWait: 10_000, timeout: 120_000 }
  );

  console.log("  ── imported ─────────────────────────────────────");
  for (const spec of TABLES) {
    console.log(`  ${spec.table.padEnd(22)} ${String(inserted[spec.table] ?? 0).padStart(5)} rows`);
  }

  // Refresh planner statistics so the very first queries are fast.
  await prisma.$executeRawUnsafe("ANALYZE;");
  console.log("\n  ANALYZE executed ✓");

  // ── verification: Postgres counts must match SQLite counts ──
  console.log("\n  ── verification (SQLite → PostgreSQL) ───────────");
  let failures = 0;
  for (const spec of TABLES) {
    const src = (payloads.get(spec.table) ?? []).length;
    const dst = await delegate(spec.model).count();
    const ok = src === dst;
    if (!ok) failures++;
    console.log(
      `  ${ok ? "✓" : "✗ MISMATCH"} ${spec.table.padEnd(22)} sqlite=${String(src).padStart(5)}  postgres=${String(dst).padStart(5)}`
    );
  }

  if (failures > 0) {
    console.error(`\n[migrate] FAILED: ${failures} table(s) did not match. Do NOT delete db/custom.db yet.`);
    process.exitCode = 1;
    return;
  }

  console.log("\n  ✅ Migration verified — every table matches row-for-row.");
  console.log("     You can now deploy to Vercel (docs/DEPLOY-POSTGRES-FA.md).");
  console.log("     Keep db/custom.db as a backup until you have confirmed the app.");
}

main()
  .catch((error) => {
    console.error("\n[migrate] FATAL:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    sqlite.close();
  });
