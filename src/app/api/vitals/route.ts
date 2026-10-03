import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Vital = {
  name: string;
  value: number;
  rating: string;
  id?: string;
  path?: string;
  t?: number;
};

const ALLOWED = new Set(["LCP", "INP", "CLS", "TTFB", "FCP"]);

/**
 * Receives Core Web Vitals beacons from the client (see src/app/web-vitals.tsx).
 * Metrics are logged so they surface in Vercel logs / dev.log. Swap the logger
 * for an analytics store when one is configured — the wire format stays stable.
 */
export async function POST(req: Request) {
  try {
    const vital = (await req.json()) as Vital;
    if (!ALLOWED.has(vital?.name) || typeof vital.value !== "number") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    console.log(
      `[vitals] ${vital.name}=${vital.value}${vital.name === "CLS" ? "‰" : "ms"} rating=${vital.rating} path=${vital.path ?? "-"}`
    );
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
