CREATE TYPE "BillingPlan" AS ENUM ('STARTER','GROWTH','PRO');
CREATE TYPE "BillingStatus" AS ENUM ('TRIAL','ACTIVE','PAST_DUE','CANCELLED','EXPIRED');
CREATE TYPE "BillingInterval" AS ENUM ('MONTHLY','YEARLY');
CREATE TABLE "Subscription" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"plan" "BillingPlan" NOT NULL DEFAULT 'STARTER',
"status" "BillingStatus" NOT NULL DEFAULT 'TRIAL',"interval" "BillingInterval" NOT NULL DEFAULT 'MONTHLY',
"currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"currentPeriodEnd" TIMESTAMP(3),
"trialEndsAt" TIMESTAMP(3),"cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,"cancelledAt" TIMESTAMP(3),
"provider" TEXT,"providerCustomerId" TEXT,"providerSubscriptionId" TEXT,
"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,
CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id"));
CREATE INDEX "Subscription_tenantId_status_createdAt_idx" ON "Subscription"("tenantId","status","createdAt");
CREATE INDEX "Subscription_provider_providerSubscriptionId_idx" ON "Subscription"("provider","providerSubscriptionId");
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
