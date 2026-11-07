-- AlterEnum
ALTER TYPE "BlockType" ADD VALUE 'latestPosts';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN "telegramUrl" TEXT;
