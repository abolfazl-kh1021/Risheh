import { PrismaClient } from "@prisma/client";
const db = new PrismaClient();
const orders = await db.order.findMany({ orderBy: { createdAt: "desc" }, take: 3, include: { sellerOrders: true, events: true, payments: true, reservations: true } });
for (const o of orders) {
  console.log(`\n${o.orderNumber}: status=${o.status} total=${o.total}`);
  console.log(`  payments: ${o.payments.map(p => `${p.provider}:${p.status}:${p.refNumber ?? "-"}`).join(", ")}`);
  console.log(`  sellerOrders: ${o.sellerOrders.map(s => `${s.sellerId.slice(-4)}=${s.status} net=${s.net} comm=${s.commission}`).join(", ")}`);
  console.log(`  reservations: ${o.reservations.map(r => r.status).join(", ")}`);
  console.log(`  events: ${o.events.length}`);
}
const ledger = await db.ledgerEntry.findMany({ orderBy: { createdAt: "desc" }, take: 8 });
console.log("\nledger:", ledger.map(l => `${l.kind}:${l.amount}:${l.status}`).join(" | "));
const revenue = await db.platformRevenueEntry.findMany({ orderBy: { createdAt: "desc" }, take: 5 });
console.log("revenue:", revenue.map(r => `${r.kind}:${r.amount}`).join(" | "));
const cartCount = await db.cartItem.count();
console.log("cart rows left:", cartCount);
await db.$disconnect();
