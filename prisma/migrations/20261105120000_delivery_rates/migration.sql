CREATE TABLE "DeliveryRate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "zoneName" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "charge" DECIMAL(12,2) NOT NULL,
  "freeShippingMinimum" DECIMAL(12,2),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DeliveryRate_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "DeliveryRate_tenantId_city_key" ON "DeliveryRate"("tenantId","city");
CREATE INDEX "DeliveryRate_tenantId_isActive_city_idx" ON "DeliveryRate"("tenantId","isActive","city");
ALTER TABLE "DeliveryRate" ADD CONSTRAINT "DeliveryRate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
