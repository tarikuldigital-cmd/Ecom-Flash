CREATE TYPE "CampaignChannel" AS ENUM ('EMAIL','SMS','WHATSAPP','SOCIAL','MANUAL');
CREATE TYPE "CampaignStatus" AS ENUM ('DRAFT','SCHEDULED','ACTIVE','PAUSED','COMPLETED','ARCHIVED');
CREATE TYPE "CampaignAudience" AS ENUM ('ALL','NEW','REGULAR','VIP');
CREATE TABLE "MarketingCampaign" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"name" TEXT NOT NULL,"channel" "CampaignChannel" NOT NULL,
"audience" "CampaignAudience" NOT NULL DEFAULT 'ALL',"status" "CampaignStatus" NOT NULL DEFAULT 'DRAFT',
"subject" TEXT,"message" TEXT NOT NULL,"budget" DECIMAL(12,2),"scheduledAt" TIMESTAMP(3),
"startedAt" TIMESTAMP(3),"completedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "MarketingCampaign_pkey" PRIMARY KEY ("id"));
CREATE INDEX "MarketingCampaign_tenantId_status_scheduledAt_idx" ON "MarketingCampaign"("tenantId","status","scheduledAt");
CREATE INDEX "MarketingCampaign_tenantId_createdAt_idx" ON "MarketingCampaign"("tenantId","createdAt");
ALTER TABLE "MarketingCampaign" ADD CONSTRAINT "MarketingCampaign_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
