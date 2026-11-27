/**
 * DB-level assertions for Week 13 smoke tests (run against LOCAL DB only).
 * bun scripts/db-assert.ts
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const orderNumber = process.argv[2] ?? "RSH-ORD-02526606-20C3";
  const order = await db.order.findUnique({
    where: { orderNumber },
    include: { items: true, payments: true, tracking: true, discountCode: true },
  });
  if (!order) throw new Error(`order ${orderNumber} not found`);

  console.log("== order ==");
  console.log({
    status: order.status,
    subtotal: order.subtotal,
    discount: order.discount,
    shipping: order.shipping,
    total: order.total,
    discountCode: order.discountCode?.code ?? null,
    payments: order.payments.map((p) => ({ status: p.status, ref: p.refNumber })),
    tracking: order.tracking.map((t) => t.status),
  });

  const expected = Math.max(0, order.subtotal - order.discount) + order.shipping;
  console.log("total consistent:", expected === order.total);

  const ledger = await db.ledgerEntry.findMany({ where: { orderId: order.id } });
  const bySeller = new Map<string, { sale: number; commission: number }>();
  for (const e of ledger) {
    const rec = bySeller.get(e.sellerId) ?? { sale: 0, commission: 0 };
    if (e.kind === "SALE") rec.sale += e.amount;
    if (e.kind === "COMMISSION") rec.commission += e.amount;
    bySeller.set(e.sellerId, rec);
  }
  console.log("== ledger ==");
  let saleSum = 0;
  for (const [seller, rec] of bySeller) {
    const expectedCommission = -Math.round(rec.sale * 0.1);
    console.log({
      seller: seller.slice(-6),
      sale: rec.sale,
      commission: rec.commission,
      commissionIs10pct: rec.commission === expectedCommission,
      net: rec.sale + rec.commission,
    });
    saleSum += rec.sale;
  }
  console.log("ledger SALE sum == netTotal:", saleSum === Math.max(0, order.subtotal - order.discount));

  const buyer = await db.user.findUnique({ where: { email: "buyer@risheh.ir" } });
  const redemptions = await db.discountRedemption.findMany({ where: { userId: buyer!.id } });
  console.log(
    "== redemptions ==",
    redemptions.map((r) => ({ codeId: r.codeId.slice(-6), status: r.status }))
  );

  if (order.discountCodeId) {
    const code = await db.discountCode.findUnique({ where: { id: order.discountCodeId } });
    console.log("== code ==", { code: code?.code, usedCount: code?.usedCount, perUserLimit: code?.perUserLimit });
  }

  const item = order.items[0];
  const artwork = await db.artwork.findUnique({ where: { id: item.artworkId } });
  console.log("== stock ==", { artwork: artwork?.title.slice(0, 20), stock: artwork?.stock });

  const cartCount = await db.cartItem.count({ where: { userId: buyer!.id } });
  console.log("buyer cart count after success:", cartCount);
}

main().finally(() => db.$disconnect());
