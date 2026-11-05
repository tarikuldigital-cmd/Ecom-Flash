CREATE TABLE "CustomerAccount" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "customerId" TEXT,
 "name" TEXT NOT NULL,
 "email" TEXT NOT NULL,
 "phone" TEXT,
 "passwordHash" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "CustomerAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "CustomerAccountSession" (
 "id" TEXT NOT NULL,
 "tenantId" TEXT NOT NULL,
 "accountId" TEXT NOT NULL,
 "tokenHash" TEXT NOT NULL,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "CustomerAccountSession_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomerAccount_customerId_key" ON "CustomerAccount"("customerId");
CREATE UNIQUE INDEX "CustomerAccount_tenantId_email_key" ON "CustomerAccount"("tenantId","email");
CREATE INDEX "CustomerAccount_tenantId_phone_idx" ON "CustomerAccount"("tenantId","phone");
CREATE UNIQUE INDEX "CustomerAccountSession_tokenHash_key" ON "CustomerAccountSession"("tokenHash");
CREATE INDEX "CustomerAccountSession_tenantId_expiresAt_idx" ON "CustomerAccountSession"("tenantId","expiresAt");
CREATE INDEX "CustomerAccountSession_accountId_expiresAt_idx" ON "CustomerAccountSession"("accountId","expiresAt");
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccount" ADD CONSTRAINT "CustomerAccount_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountSession" ADD CONSTRAINT "CustomerAccountSession_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "CustomerAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerAccountSession" ADD CONSTRAINT "CustomerAccountSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
