import { type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

/**
 * Admin revenue report — CSV export (S3, §۴.۵).
 * `?from=YYYY-MM-DD&to=YYYY-MM-DD&kind=COMMISSION|LISTING_FEE|SUBSCRIPTION`
 */
export const dynamic = "force-dynamic";

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return new Response("Forbidden", { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const fromStr = sp.get("from");
  const toStr = sp.get("to");
  const kind = sp.get("kind");

  const where: Record<string, unknown> = {};
  if (fromStr || toStr) {
    where.createdAt = {
      ...(fromStr ? { gte: new Date(fromStr) } : {}),
      ...(toStr ? { lte: new Date(`${toStr}T23:59:59.999Z`) } : {}),
    };
  }
  if (kind && ["COMMISSION", "LISTING_FEE", "SUBSCRIPTION"].includes(kind)) {
    where.kind = kind;
  }

  const rows = await db.platformRevenueEntry.findMany({
    where: where as never,
    orderBy: { createdAt: "asc" },
    take: 20000,
  });

  const header = "date,kind,amount_toman,sellerId,orderId,invoiceId,detail\n";
  const body = rows
    .map((r) =>
      [
        isoDay(r.createdAt),
        r.kind,
        r.amount,
        r.sellerId ?? "",
        r.orderId ?? "",
        r.invoiceId ?? "",
        (r.detail ?? "").replace(/[",\n]/g, " "),
      ].join(",")
    )
    .join("\n");
  const total = rows.reduce((s, r) => s + r.amount, 0);
  const footer = `\nTOTAL,${rows.length} rows,${total}\n`;

  return new Response(`\uFEFF${header}${body}${footer}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="risheh-revenue-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
