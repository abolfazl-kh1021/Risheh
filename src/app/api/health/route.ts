import { NextResponse } from "next/server";

/**
 * Liveness/health probe for Docker healthchecks, CI smoke tests and
 * uptime monitors. Deliberately DB-free and auth-free: it only proves
 * the Next.js server is up and serving responses.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "risheh",
      ts: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
