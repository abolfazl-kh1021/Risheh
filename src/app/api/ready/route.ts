import { NextResponse } from "next/server";
import { dbHealthCheck } from "@/lib/db";

/**
 * Readiness probe — verifies the DATABASE actually answers (unlike /api/health
 * which is DB-free). Used by Vercel/monitor checks before taking traffic.
 */
export const dynamic = "force-dynamic";

export async function GET() {
  const dbOk = await dbHealthCheck();
  return NextResponse.json(
    {
      ok: dbOk,
      checks: { database: dbOk ? "up" : "down" },
      ts: new Date().toISOString(),
    },
    { status: dbOk ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
