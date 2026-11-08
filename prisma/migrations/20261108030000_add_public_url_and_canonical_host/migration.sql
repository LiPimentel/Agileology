-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "publicUrl" TEXT,
ADD COLUMN "canonicalHost" TEXT NOT NULL DEFAULT 'none';
