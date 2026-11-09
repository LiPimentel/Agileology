-- A page can be laid out wide without using the side areas.
ALTER TABLE "Background" ADD COLUMN "wideLayout" BOOLEAN NOT NULL DEFAULT false;
