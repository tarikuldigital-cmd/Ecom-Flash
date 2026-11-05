CREATE TABLE "LandingPage" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "sections" JSONB NOT NULL,
  "seoTitle" TEXT,
  "seoDescription" TEXT,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "LandingPage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "LandingPage_tenantId_slug_key" ON "LandingPage"("tenantId", "slug");
CREATE INDEX "LandingPage_tenantId_status_updatedAt_idx" ON "LandingPage"("tenantId", "status", "updatedAt");
ALTER TABLE "LandingPage" ADD CONSTRAINT "LandingPage_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
