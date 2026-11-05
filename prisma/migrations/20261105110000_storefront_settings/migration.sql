ALTER TABLE "Store"
  ADD COLUMN "tagline" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "logoUrl" TEXT,
  ADD COLUMN "bannerUrl" TEXT,
  ADD COLUMN "announcement" TEXT,
  ADD COLUMN "primaryColor" TEXT NOT NULL DEFAULT '#193c2c',
  ADD COLUMN "contactPhone" TEXT,
  ADD COLUMN "contactEmail" TEXT;
