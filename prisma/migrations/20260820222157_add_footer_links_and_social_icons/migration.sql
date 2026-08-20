-- AlterTable
ALTER TABLE "MenuItem" ADD COLUMN     "location" TEXT NOT NULL DEFAULT 'header';

-- AlterTable
ALTER TABLE "SiteSettings" ADD COLUMN     "facebookIconUrl" TEXT,
ADD COLUMN     "instagramIconUrl" TEXT,
ADD COLUMN     "linkedinIconUrl" TEXT,
ADD COLUMN     "twitterIconUrl" TEXT;
