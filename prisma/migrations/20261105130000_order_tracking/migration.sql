ALTER TABLE "Order" ADD COLUMN "trackingTokenHash" TEXT;
CREATE UNIQUE INDEX "Order_trackingTokenHash_key" ON "Order"("trackingTokenHash");
