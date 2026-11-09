CREATE TYPE "SubscriptionPlan" AS ENUM ('FREE','STARTER','GROWTH','BUSINESS');
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIAL','ACTIVE','PAST_DUE','CANCELED','EXPIRED');
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY','YEARLY');
CREATE TYPE "PlanChangeRequestStatus" AS ENUM ('PENDING','APPROVED','REJECTED','CANCELED');
CREATE TABLE "TenantSubscription" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"plan" "SubscriptionPlan" NOT NULL DEFAULT 'FREE',
"status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIAL',"billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',
"trialEndsAt" TIMESTAMP(3),"currentPeriodStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"currentPeriodEnd" TIMESTAMP(3),"cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
"canceledAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "TenantSubscription_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "TenantSubscription_tenantId_key" ON "TenantSubscription"("tenantId");
ALTER TABLE "TenantSubscription" ADD CONSTRAINT "TenantSubscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "PlanChangeRequest" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"requestedPlan" "SubscriptionPlan" NOT NULL,
"billingCycle" "BillingCycle" NOT NULL DEFAULT 'MONTHLY',"status" "PlanChangeRequestStatus" NOT NULL DEFAULT 'PENDING',
"note" TEXT,"reviewedAt" TIMESTAMP(3),"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PlanChangeRequest_pkey" PRIMARY KEY ("id"));
CREATE INDEX "PlanChangeRequest_tenantId_status_createdAt_idx" ON "PlanChangeRequest"("tenantId","status","createdAt");
ALTER TABLE "PlanChangeRequest" ADD CONSTRAINT "PlanChangeRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE TABLE "BillingInvoice" (
"id" TEXT NOT NULL,"tenantId" TEXT NOT NULL,"invoiceNumber" TEXT NOT NULL,"description" TEXT NOT NULL,
"amount" DECIMAL(12,2) NOT NULL,"currency" TEXT NOT NULL DEFAULT 'BDT',"status" TEXT NOT NULL DEFAULT 'DRAFT',
"issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"dueAt" TIMESTAMP(3),"paidAt" TIMESTAMP(3),
"paymentReference" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "BillingInvoice_tenantId_invoiceNumber_key" ON "BillingInvoice"("tenantId","invoiceNumber");
CREATE INDEX "BillingInvoice_tenantId_status_issuedAt_idx" ON "BillingInvoice"("tenantId","status","issuedAt");
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
