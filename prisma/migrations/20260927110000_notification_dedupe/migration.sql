ALTER TABLE "Announcement"
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceId" TEXT,
ADD COLUMN "dedupeKey" TEXT;

CREATE UNIQUE INDEX "Announcement_dedupeKey_key" ON "Announcement"("dedupeKey");
CREATE INDEX "Announcement_schoolId_sourceType_sourceId_idx" ON "Announcement"("schoolId", "sourceType", "sourceId");
