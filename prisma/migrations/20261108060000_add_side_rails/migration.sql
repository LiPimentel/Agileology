-- Side rails: a section can sit full width (default, as today), in the centre column or in a left/right rail.
ALTER TABLE "ContentBlock" ADD COLUMN "sectionZone" TEXT NOT NULL DEFAULT 'full';
ALTER TABLE "Background" ADD COLUMN "sideLeftWidth" INTEGER NOT NULL DEFAULT 22;
ALTER TABLE "Background" ADD COLUMN "sideRightWidth" INTEGER NOT NULL DEFAULT 22;
