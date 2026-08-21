-- AlterTable
ALTER TABLE "VisitLog" ADD COLUMN     "eventType" TEXT NOT NULL DEFAULT 'pageview',
ADD COLUMN     "label" TEXT;

-- CreateIndex
CREATE INDEX "VisitLog_eventType_idx" ON "VisitLog"("eventType");
