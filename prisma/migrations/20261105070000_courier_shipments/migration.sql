CREATE TYPE "CourierProvider" AS ENUM ('PATHAO', 'STEADFAST', 'REDX', 'PAPERFLY', 'ECOURIER', 'OTHER');
CREATE TYPE "ShipmentStatus" AS ENUM ('DRAFT', 'BOOKED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED', 'DELIVERY_FAILED', 'RETURNED', 'CANCELLED');

CREATE TABLE "CourierAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "provider" "CourierProvider" NOT NULL,
  "displayName" TEXT NOT NULL,
  "isEnabled" BOOLEAN NOT NULL DEFAULT false,
  "accountReference" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CourierAccount_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Shipment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "courierAccountId" TEXT,
  "provider" "CourierProvider" NOT NULL,
  "status" "ShipmentStatus" NOT NULL DEFAULT 'DRAFT',
  "recipientName" TEXT NOT NULL,
  "recipientPhone" TEXT NOT NULL,
  "deliveryAddress" TEXT NOT NULL,
  "deliveryCity" TEXT,
  "parcelDescription" TEXT,
  "weightGrams" INTEGER,
  "codAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "deliveryCharge" DECIMAL(12,2) NOT NULL DEFAULT 0,
  "trackingNumber" TEXT,
  "consignmentId" TEXT,
  "bookingReference" TEXT,
  "trackingUrl" TEXT,
  "bookedAt" TIMESTAMP(3),
  "deliveredAt" TIMESTAMP(3),
  "lastSyncedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "ShipmentEvent" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "shipmentId" TEXT NOT NULL,
  "actorId" TEXT,
  "status" "ShipmentStatus" NOT NULL,
  "title" TEXT NOT NULL,
  "details" TEXT,
  "source" TEXT NOT NULL DEFAULT 'MANUAL',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ShipmentEvent_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CourierAccount_tenantId_provider_key" ON "CourierAccount"("tenantId","provider");
CREATE INDEX "CourierAccount_tenantId_isEnabled_idx" ON "CourierAccount"("tenantId","isEnabled");
CREATE INDEX "Shipment_tenantId_status_createdAt_idx" ON "Shipment"("tenantId","status","createdAt");
CREATE INDEX "Shipment_tenantId_orderId_createdAt_idx" ON "Shipment"("tenantId","orderId","createdAt");
CREATE INDEX "Shipment_tenantId_trackingNumber_idx" ON "Shipment"("tenantId","trackingNumber");
CREATE INDEX "ShipmentEvent_tenantId_shipmentId_createdAt_idx" ON "ShipmentEvent"("tenantId","shipmentId","createdAt");
CREATE INDEX "ShipmentEvent_actorId_createdAt_idx" ON "ShipmentEvent"("actorId","createdAt");
ALTER TABLE "CourierAccount" ADD CONSTRAINT "CourierAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_courierAccountId_fkey" FOREIGN KEY ("courierAccountId") REFERENCES "CourierAccount"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ShipmentEvent" ADD CONSTRAINT "ShipmentEvent_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
