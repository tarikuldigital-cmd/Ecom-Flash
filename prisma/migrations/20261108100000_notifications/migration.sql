CREATE TABLE "Notification" ("id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"type" TEXT NOT NULL,"title" TEXT NOT NULL,"message" TEXT NOT NULL,"entityType" TEXT,"entityId" TEXT,"readAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Notification_tenantId_readAt_createdAt_idx" ON "Notification"("tenantId","readAt","createdAt");
CREATE INDEX "Notification_tenantId_entityType_entityId_idx" ON "Notification"("tenantId","entityType","entityId");
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
