CREATE TYPE "CouponType" AS ENUM ('PERCENTAGE','FIXED');
CREATE TABLE "Coupon" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"code" TEXT NOT NULL,"type" "CouponType" NOT NULL,
"value" DECIMAL(12,2) NOT NULL,"minSubtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
"maxDiscount" DECIMAL(12,2),"usageLimit" INTEGER,"usageCount" INTEGER NOT NULL DEFAULT 0,
"startsAt" TIMESTAMP(3),"expiresAt" TIMESTAMP(3),"isActive" BOOLEAN NOT NULL DEFAULT true,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Coupon_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Coupon_tenantId_code_key" ON "Coupon"("tenantId","code");
CREATE INDEX "Coupon_tenantId_isActive_expiresAt_idx" ON "Coupon"("tenantId","isActive","expiresAt");
ALTER TABLE "Coupon" ADD CONSTRAINT "Coupon_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Order" ADD COLUMN "couponId" TEXT, ADD COLUMN "couponCode" TEXT;
ALTER TABLE "Order" ADD CONSTRAINT "Order_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "Coupon"("id") ON DELETE SET NULL ON UPDATE CASCADE;
