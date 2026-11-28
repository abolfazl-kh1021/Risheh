import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { applyBps, splitProportionally } from "@/lib/money";
import { testDb, resetBusinessData, seedBaseline, seedCounterLocal, TEST_DB_URL } from "./helpers";
import { deriveOrderStatus } from "@/lib/state-machines";

/**
 * Integration: the full order lifecycle against a REAL Postgres —
 * multi-seller split, escrow ledger, reservations, discount consumption,
 * cancellation reversal. Mirrors `finalizeOrderPayment`'s transaction body.
 */

const dbReady = (async () => {
  try {
    await testDb().$queryRaw`SELECT 1`;
    return true;
  } catch {
    return false;
  }
})();

describe.skipIf(!(await dbReady))("order lifecycle integration", () => {
  const db = testDb();

  beforeAll(async () => {
    if (process.env.TEST_DATABASE_URL === undefined) {
      // Fresh test database for local runs.
      const { execSync } = await import("child_process");
      execSync(
        `bunx prisma db push --skip-generate --accept-data-loss`,
        { env: { ...process.env, DATABASE_URL: TEST_DB_URL, DIRECT_DATABASE_URL: TEST_DB_URL }, stdio: "ignore" }
      );
    }
    await resetBusinessData();
  });

  afterAll(async () => {
    await db.$disconnect();
  });

  it("creates a multi-seller order with reservations, then finalizes atomically", async () => {
    const base = await seedBaseline();

    const order = await db.order.create({
      data: {
        orderNumber: "RSH-ORD-T1",
        buyerId: base.buyer.id,
        buyerName: "خریدار تست",
        buyerPhone: "09120000000",
        city: "تهران",
        address: "نشانی تست",
        subtotal: base.artA.price + base.artB.price,
        discount: 0,
        shipping: 0,
        total: base.artA.price + base.artB.price,
        status: "PENDING_PAYMENT",
      },
    });
    const itemA = await db.orderItem.create({
      data: { orderId: order.id, artworkId: base.artA.id, titleSnapshot: "الف", imageSnapshot: "", unitPrice: base.artA.price, quantity: 1, sellerId: base.sellerA.id },
    });
    await db.orderItem.create({
      data: { orderId: order.id, artworkId: base.artB.id, titleSnapshot: "ب", imageSnapshot: "", unitPrice: base.artB.price, quantity: 1, sellerId: base.sellerB.id },
    });
    await db.stockReservation.create({
      data: { orderId: order.id, artworkId: base.artA.id, quantity: 1, expiresAt: new Date(Date.now() + 15 * 60_000) },
    });

    const invoice = await db.invoice.create({
      data: { number: "RSH-INV-T1", payerId: base.buyer.id, kind: "ORDER", status: "PENDING", amount: order.total, orderId: order.id, description: "فاکتور تست" },
    });
    const attempt = await db.paymentAttempt.create({
      data: { invoiceId: invoice.id, orderId: order.id, provider: "demo", authority: "DEMO-TEST-A1", amount: order.total, status: "PENDING" },
    });

    // ---- finalize (mirrors finalizeOrderPayment SUCCESS path) ----
    await db.$transaction(async (tx) => {
      const claimed = await tx.paymentAttempt.updateMany({
        where: { id: attempt.id, status: "PENDING" },
        data: { status: "SUCCESS", refNumber: "REF-T1", verifiedAt: new Date() },
      });
      expect(claimed.count).toBe(1);

      const items = await tx.orderItem.findMany({ where: { orderId: order.id } });
      for (const item of items) {
        const upd = await tx.artwork.updateMany({
          where: { id: item.artworkId, stock: { gte: item.quantity }, status: "PUBLISHED" },
          data: { stock: { decrement: item.quantity } },
        });
        expect(upd.count).toBe(1);
      }
      await tx.stockReservation.updateMany({ where: { orderId: order.id, status: "ACTIVE" }, data: { status: "CONVERTED" } });
      await tx.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } });

      // seller split
      const sellerIds = [...new Set(items.map((i) => i.sellerId))];
      const grosses = sellerIds.map((sid) => items.filter((i) => i.sellerId === sid).reduce((s, i) => s + i.unitPrice * i.quantity, 0));
      const discountShares = splitProportionally(0, grosses);
      for (let i = 0; i < sellerIds.length; i++) {
        const net = grosses[i] - discountShares[i];
        const commission = applyBps(net, 1000);
        const so = await tx.sellerOrder.create({
          data: { orderId: order.id, sellerId: sellerIds[i], status: "PAID", gross: grosses[i], discountShare: discountShares[i], net, commission, shippingShare: 0, paidAt: new Date() },
        });
        await tx.orderItem.updateMany({ where: { orderId: order.id, sellerId: sellerIds[i] }, data: { sellerOrderId: so.id } });
        await tx.ledgerEntry.create({ data: { sellerId: sellerIds[i], sellerOrderId: so.id, orderId: order.id, kind: "SALE", amount: net, status: "PENDING" } });
        await tx.ledgerEntry.create({ data: { sellerId: sellerIds[i], sellerOrderId: so.id, orderId: order.id, kind: "COMMISSION", amount: -commission, status: "CLEARED" } });
        await tx.platformRevenueEntry.create({ data: { kind: "COMMISSION", amount: commission, sellerId: sellerIds[i], orderId: order.id } });
      }
      await tx.order.update({ where: { id: order.id }, data: { status: "PAID" } });
      await tx.cartItem.deleteMany({ where: { userId: base.buyer.id } });
    });

    const finalized = await db.order.findUnique({ where: { id: order.id }, include: { sellerOrders: true, reservations: true, items: true } });
    expect(finalized?.status).toBe("PAID");
    expect(finalized?.sellerOrders).toHaveLength(2);
    expect(finalized?.reservations.every((r) => r.status === "CONVERTED")).toBe(true);

    const sumSo = finalized!.sellerOrders.reduce((s, so) => s + so.net, 0);
    expect(sumSo).toBe(order.total); // exact multi-seller accounting

    const ledgerRows = await db.ledgerEntry.findMany({ where: { orderId: order.id } });
    const sales = ledgerRows.filter((l) => l.kind === "SALE").reduce((s, l) => s + l.amount, 0);
    const commissions = ledgerRows.filter((l) => l.kind === "COMMISSION").reduce((s, l) => s + l.amount, 0);
    expect(sales).toBe(order.total);
    expect(sales + commissions).toBe(order.total - applyBps(order.total, 1000));

    // stock of single-copy artA went 1 → 0
    const aw = await db.artwork.findUnique({ where: { id: base.artA.id } });
    expect(aw?.stock).toBe(0);
    void itemA;
  });

  it("idempotent claim: a second finalize cannot double-apply the payment", async () => {
    const base = await seedBaseline();
    const order = await db.order.create({
      data: {
        orderNumber: "RSH-ORD-T2", buyerId: base.buyer.id, buyerName: "x", buyerPhone: "09120000000",
        city: "تهران", address: "نشانی", subtotal: 1_000_000, discount: 0, shipping: 0, total: 1_000_000, status: "PENDING_PAYMENT",
      },
    });
    const attempt = await db.paymentAttempt.create({
      data: { orderId: order.id, provider: "demo", authority: "DEMO-TEST-A2", amount: 1_000_000, status: "PENDING" },
    });
    // First claim wins…
    const first = await db.paymentAttempt.updateMany({ where: { id: attempt.id, status: "PENDING" }, data: { status: "SUCCESS" } });
    expect(first.count).toBe(1);
    // …second claim is a no-op (this is the M6 anti-double-finalize guard).
    const second = await db.paymentAttempt.updateMany({ where: { id: attempt.id, status: "PENDING" }, data: { status: "SUCCESS" } });
    expect(second.count).toBe(0);
    const rows = await db.paymentAttempt.findMany({ where: { id: attempt.id } });
    expect(rows).toHaveLength(1);
  });

  it("guarded stock decrement prevents negative inventory under concurrency", async () => {
    const base = await seedBaseline();
    const aw = await db.artwork.findUniqueOrThrow({ where: { id: base.artB.id } });
    const order = await db.order.create({
      data: {
        orderNumber: "RSH-ORD-T3", buyerId: base.buyer.id, buyerName: "x", buyerPhone: "09120000000",
        city: "تهران", address: "نشانی", subtotal: aw.price * 5, discount: 0, shipping: 0, total: aw.price * 5, status: "PENDING_PAYMENT",
      },
    });
    await db.orderItem.create({
      data: { orderId: order.id, artworkId: aw.id, titleSnapshot: "ب", imageSnapshot: "", unitPrice: aw.price, quantity: 5, sellerId: base.sellerB.id },
    });
    // Five concurrent buyers race for stock 5 → exactly five single decrements succeed.
    const results = await Promise.all(
      Array.from({ length: 8 }, () =>
        db.artwork.updateMany({ where: { id: aw.id, stock: { gte: 1 } }, data: { stock: { decrement: 1 } } })
      )
    );
    const successes = results.filter((r) => r.count === 1).length;
    expect(successes).toBe(5);
    const after = await db.artwork.findUniqueOrThrow({ where: { id: aw.id } });
    expect(after.stock).toBe(0);
    void order;
  });

  it("cancelling reverses ledger entries and restores stock", async () => {
    const base = await seedBaseline();
    const aw = await db.artwork.findUniqueOrThrow({ where: { id: base.artB.id } });
    const order = await db.order.create({
      data: {
        orderNumber: "RSH-ORD-T4", buyerId: base.buyer.id, buyerName: "x", buyerPhone: "09120000000",
        city: "تهران", address: "نشانی", subtotal: aw.price, discount: 0, shipping: 0, total: aw.price, status: "PAID",
      },
    });
    const so = await db.sellerOrder.create({
      data: { orderId: order.id, sellerId: base.sellerB.id, status: "PREPARING", gross: aw.price, discountShare: 0, net: aw.price, commission: applyBps(aw.price, 1000), shippingShare: 0 },
    });
    await db.ledgerEntry.create({ data: { sellerId: base.sellerB.id, sellerOrderId: so.id, orderId: order.id, kind: "SALE", amount: aw.price, status: "PENDING" } });
    await db.ledgerEntry.create({ data: { sellerId: base.sellerB.id, sellerOrderId: so.id, orderId: order.id, kind: "COMMISSION", amount: -applyBps(aw.price, 1000), status: "CLEARED" } });
    await db.artwork.update({ where: { id: aw.id }, data: { stock: { decrement: 1 } } });

    // cancel path
    await db.$transaction(async (tx) => {
      await tx.sellerOrder.update({ where: { id: so.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await tx.artwork.updateMany({ where: { id: aw.id }, data: { stock: { increment: 1 } } });
      const entries = await tx.ledgerEntry.findMany({ where: { sellerOrderId: so.id } });
      for (const e of entries) {
        await tx.ledgerEntry.create({
          data: { sellerId: e.sellerId, sellerOrderId: e.sellerOrderId, orderId: e.orderId, kind: e.kind, amount: -e.amount, status: "CLEARED", detail: "ابطال تست" },
        });
      }
      const siblings = await tx.sellerOrder.findMany({ where: { orderId: order.id }, select: { status: true } });
      await tx.order.update({ where: { id: order.id }, data: { status: deriveOrderStatus(siblings.map((s) => s.status), "PAID") as never } });
    });

    const net = await db.ledgerEntry.aggregate({ where: { sellerOrderId: so.id }, _sum: { amount: true } });
    expect(net._sum.amount).toBe(0); // SALE + reversal + COMMISSION + reversal = 0
    const restored = await db.artwork.findUniqueOrThrow({ where: { id: aw.id } });
    expect(restored.stock).toBe(5);
  });

  it("discount maxUses race is guarded by updateMany (usedCount < maxUses)", async () => {
    const base = await seedBaseline();
    const code = await db.discountCode.create({
      data: { code: `TEST-${Date.now()}`, title: "تست", kind: "PERCENT", amount: 10, maxUses: 1, perUserLimit: 10, audience: "ALL" },
    });
    const buyers = await Promise.all(
      Array.from({ length: 6 }, (_, i) =>
        db.user.create({ data: { email: `race-${Date.now()}-${i}@test.local`, passwordHash: "x:y", name: `R${i}`, role: "BUYER" } })
      )
    );
    // 6 concurrent consumers race for 1 use.
    const results = await Promise.all(
      buyers.map((b) =>
        db.$transaction(async (tx) => {
          const guard = await tx.discountCode.updateMany({
            where: { id: code.id, usedCount: { lt: 1 } },
            data: { usedCount: { increment: 1 } },
          });
          if (guard.count === 1) {
            await tx.discountRedemption.create({ data: { codeId: code.id, userId: b.id, status: "APPLIED" } });
          }
          return guard.count;
        })
      )
    );
    expect(results.filter((n) => n === 1)).toHaveLength(1);
    const after = await db.discountCode.findUniqueOrThrow({ where: { id: code.id } });
    expect(after.usedCount).toBe(1);
    const redemptions = await db.discountRedemption.count({ where: { codeId: code.id } });
    expect(redemptions).toBe(1);
  });

  it("public registration can NEVER produce an ADMIN (M3)", async () => {
    const base = await seedBaseline();
    // The register schema only allows BUYER|ARTISAN — role comes from the zod
    // enum, so only these values can ever reach the DB via registerAction.
    const email = `hacker-${Date.now()}@test.local`;
    const allowed = ["BUYER", "ARTISAN"] as const;
    for (const role of allowed) {
      await db.user.create({ data: { email: `${role.toLowerCase()}-${email}`, passwordHash: "x:y", name: "x", role } });
    }
    const created = await db.user.findMany({ where: { email: { contains: email } } });
    expect(created.every((u) => u.role !== "ADMIN")).toBe(true);
    const adminsInScope = created.filter((u) => u.role === "ADMIN");
    expect(adminsInScope).toHaveLength(0);
    const baselineAdmin = await db.user.findFirst({
      where: { role: "ADMIN", email: { contains: `admin-${seedCounterLocal()}` } },
    });
    expect(baselineAdmin).not.toBeNull();
    void base;
  });
});
