CREATE TABLE "TeamInvitation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MemberRole" NOT NULL DEFAULT 'STAFF',
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TeamInvitation_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "TeamInvitation_tokenHash_key" ON "TeamInvitation"("tokenHash");
CREATE UNIQUE INDEX "TeamInvitation_tenantId_email_key" ON "TeamInvitation"("tenantId", "email");
CREATE INDEX "TeamInvitation_tenantId_acceptedAt_expiresAt_idx" ON "TeamInvitation"("tenantId", "acceptedAt", "expiresAt");
ALTER TABLE "TeamInvitation" ADD CONSTRAINT "TeamInvitation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
