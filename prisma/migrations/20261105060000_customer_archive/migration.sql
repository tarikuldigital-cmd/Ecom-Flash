ALTER TABLE "Customer" ADD COLUMN "isArchived" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Customer_tenantId_isArchived_createdAt_idx" ON "Customer"("tenantId", "isArchived", "createdAt");
