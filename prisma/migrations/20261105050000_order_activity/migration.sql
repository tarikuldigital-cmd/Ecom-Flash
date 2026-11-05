CREATE TABLE "OrderActivity" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OrderActivity_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "OrderActivity_tenantId_orderId_createdAt_idx" ON "OrderActivity"("tenantId", "orderId", "createdAt");
CREATE INDEX "OrderActivity_actorId_createdAt_idx" ON "OrderActivity"("actorId", "createdAt");
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderActivity" ADD CONSTRAINT "OrderActivity_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
