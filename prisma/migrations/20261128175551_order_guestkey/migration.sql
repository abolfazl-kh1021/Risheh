-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "guestKey" TEXT;

-- CreateIndex
CREATE INDEX "orders_guestKey_idx" ON "orders"("guestKey");

