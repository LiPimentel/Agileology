-- CreateTable
CREATE TABLE "MenuItem" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "linkType" TEXT NOT NULL,
    "pageId" TEXT,
    "externalUrl" TEXT,
    "newTab" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "visible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "MenuItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MenuItem_pageId_idx" ON "MenuItem"("pageId");

-- AddForeignKey
ALTER TABLE "MenuItem" ADD CONSTRAINT "MenuItem_pageId_fkey" FOREIGN KEY ("pageId") REFERENCES "Page"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: recreate today's effective nav (which was auto-derived from
-- Page.menuOrder/menuVisible/showInMenu, plus a hardcoded "Inicio" and
-- "Blog" link) as real MenuItem rows, so the site's visible menu doesn't
-- change the moment this migration runs -- from here on it's edited via
-- the new menu admin screen, not by those Page checkboxes.
INSERT INTO "MenuItem" (id, label, "linkType", "externalUrl", "pageId", "order", visible)
SELECT gen_random_uuid()::text, 'Inicio', 'page', NULL, id, 0, true
FROM "Page" WHERE slug = 'home' AND status = 'published'
LIMIT 1;

INSERT INTO "MenuItem" (id, label, "linkType", "pageId", "externalUrl", "order", visible)
SELECT gen_random_uuid()::text, title, 'page', id, NULL, "menuOrder" + 1, true
FROM "Page"
WHERE status = 'published' AND "showInMenu" = true AND "menuVisible" = true AND slug != 'home';

INSERT INTO "MenuItem" (id, label, "linkType", "pageId", "externalUrl", "order", visible)
VALUES (gen_random_uuid()::text, 'Blog', 'url', NULL, '/blog', 9999, true);
