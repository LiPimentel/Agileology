-- Minimum height (px) of a section; 0 = as tall as its content.
ALTER TABLE "ContentBlock" ADD COLUMN "sectionMinHeight" INTEGER NOT NULL DEFAULT 0;
