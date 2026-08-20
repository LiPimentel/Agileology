-- AlterTable
ALTER TABLE "ContentBlock" ADD COLUMN     "sectionBgColor" TEXT NOT NULL DEFAULT '#000000',
ADD COLUMN     "sectionBgImageUrl" TEXT,
ADD COLUMN     "sectionBgOpacity" DOUBLE PRECISION NOT NULL DEFAULT 0;
