CREATE TABLE "CustomerAddress" (
 "id" TEXT NOT NULL, "tenantId" TEXT NOT NULL, "accountId" TEXT NOT NULL,
 "label" TEXT NOT NULL DEFAULT 'Home', "recipientName" TEXT NOT NULL, "phone" TEXT NOT NULL,
 "address" TEXT NOT NULL, "city" TEXT NOT NULL, "isDefault" BOOLEAN NOT NULL DEFAULT false,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CustomerAddress_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomerAddress_tenantId_accountId_isDefault_idx" ON "CustomerAddress"("tenantId","accountId","isDefault");
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAddress" ADD CONSTRAINT "CustomerAddress_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
