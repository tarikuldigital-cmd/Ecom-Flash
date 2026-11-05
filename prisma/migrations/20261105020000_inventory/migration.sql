CREATE TYPE "StockMovementType" AS ENUM ('ADJUSTMENT', 'RESTOCK', 'SALE', 'RETURN', 'DAMAGE', 'CORRECTION');

CREATE TABLE "InventoryMovement" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "productId" TEXT NOT NULL,
  "actorId" TEXT,
  "type" "StockMovementType" NOT NULL,
  "quantityDelta" INTEGER NOT NULL,
  "stockBefore" INTEGER NOT NULL,
  "stockAfter" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "InventoryMovement_tenantId_createdAt_idx" ON "InventoryMovement"("tenantId", "createdAt");
CREATE INDEX "InventoryMovement_tenantId_productId_createdAt_idx" ON "InventoryMovement"("tenantId", "productId", "createdAt");

ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
