CREATE TYPE "AbandonedCartStatus" AS ENUM ('OPEN','RECOVERED','EXPIRED');
CREATE TABLE "AbandonedCart" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"customerName" TEXT NOT NULL,"phone" TEXT NOT NULL,"email" TEXT,
"items" JSONB NOT NULL,"subtotal" DECIMAL(12,2) NOT NULL,"recoveryTokenHash" TEXT NOT NULL,
"status" "AbandonedCartStatus" NOT NULL DEFAULT 'OPEN',"consentToRecovery" BOOLEAN NOT NULL DEFAULT false,
"consentAt" TIMESTAMP(3),"lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"recoveredAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "AbandonedCart_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "AbandonedCart_recoveryTokenHash_key" ON "AbandonedCart"("recoveryTokenHash");
CREATE INDEX "AbandonedCart_tenantId_status_lastActivityAt_idx" ON "AbandonedCart"("tenantId","status","lastActivityAt");
CREATE INDEX "AbandonedCart_tenantId_phone_idx" ON "AbandonedCart"("tenantId","phone");
ALTER TABLE "AbandonedCart" ADD CONSTRAINT "AbandonedCart_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
