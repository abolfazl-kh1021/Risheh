/**
 * Integration test DB bootstrap — connects to a REAL Postgres
 * (TEST_DATABASE_URL, default: local sandbox postgres on :5433/db `risheh_test`).
 * CI provides a service container (see .github/workflows/ci.yml).
 */
import { PrismaClient } from "@prisma/client";

export const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? "postgresql://postgres@127.0.0.1:5433/risheh_test";

let client: PrismaClient | null = null;

export function testDb(): PrismaClient {
  if (!client) {
    client = new PrismaClient({ datasources: { db: { url: TEST_DB_URL } } });
  }
  return client;
}

/** Reset all business rows between tests (keep plans/settings/shipping). */
export function seedCounterLocal(): number {
  return seedCounter;
}

export async function resetBusinessData(): Promise<void> {
  const db = testDb();
  await db.returnRequest.deleteMany();
  await db.orderEvent.deleteMany();
  await db.paymentEvent.deleteMany();
  await db.paymentAttempt.deleteMany();
  await db.stockReservation.deleteMany();
  await db.orderItem.deleteMany();
  await db.sellerOrder.deleteMany();
  await db.order.deleteMany();
  await db.invoice.deleteMany();
  await db.subscription.deleteMany();
  await db.ledgerEntry.deleteMany();
  await db.payoutRequest.deleteMany();
  await db.address.deleteMany();
  await db.notification.deleteMany();
  await db.review.deleteMany();
  await db.discountRedemption.deleteMany();
  await db.discountCode.deleteMany();
  await db.discountArtwork.deleteMany();
  await db.discountCampaign.deleteMany();
  await db.auditLog.deleteMany();
  await db.memberRequest.deleteMany();
  await db.artwork.deleteMany();
  await db.category.deleteMany();
  await db.session.deleteMany();
  await db.user.deleteMany();
}

let seedCounter = 0;

export async function seedBaseline(): Promise<{
  buyer: { id: string; email: string };
  sellerA: { id: string; email: string };
  sellerB: { id: string; email: string };
  admin: { id: string; email: string };
  catA: string;
  artA: { id: string; price: number };
  artB: { id: string; price: number };
}> {
  const db = testDb();
  seedCounter += 1;
  const hash = await (async () => {
    const { scryptSync, randomBytes } = await import("crypto");
    const salt = randomBytes(16).toString("hex");
    return `${salt}:${scryptSync("pw-12345678", salt, 64).toString("hex")}`;
  })();
  const admin = await db.user.create({
    data: { email: `admin-${seedCounter}@test.local`, passwordHash: hash, name: "Admin", role: "ADMIN", verified: true },
  });
  const buyer = await db.user.create({
    data: { email: `buyer-${seedCounter}@test.local`, passwordHash: hash, name: "Buyer", role: "BUYER" },
  });
  const sellerA = await db.user.create({
    data: { email: `a-${seedCounter}@test.local`, passwordHash: hash, name: "Seller A", role: "ARTISAN", shopTitle: "کارگاه الف", verified: true },
  });
  const sellerB = await db.user.create({
    data: { email: `b-${seedCounter}@test.local`, passwordHash: hash, name: "Seller B", role: "ARTISAN", shopTitle: "کارگاه ب", verified: true },
  });
  const cat = await db.category.create({
    data: { slug: `test-cat-${seedCounter}-${Date.now()}`, title: "دسته تست" },
  });
  const artA = await db.artwork.create({
    data: {
      code: `RSH-T${Date.now() % 100000}`,
      slug: `test-a-${Date.now()}`,
      title: "اثر الف",
      sellerId: sellerA.id,
      categoryId: cat.id,
      description: "توضیح اثر الف برای تست",
      price: 2_500_000,
      images: JSON.stringify(["/assets/img/logo-mark.webp"]),
      stock: 1,
      status: "PUBLISHED",
    },
  });
  const artB = await db.artwork.create({
    data: {
      code: `RSH-U${Date.now() % 100000}`,
      slug: `test-b-${Date.now()}`,
      title: "اثر ب",
      sellerId: sellerB.id,
      categoryId: cat.id,
      description: "توضیح اثر ب برای تست",
      price: 1_890_000,
      images: JSON.stringify(["/assets/img/logo-mark.webp"]),
      stock: 5,
      status: "PUBLISHED",
    },
  });
  return { buyer, sellerA, sellerB, admin, catA: cat.id, artA: { id: artA.id, price: artA.price }, artB: { id: artB.id, price: artB.price } };
}
