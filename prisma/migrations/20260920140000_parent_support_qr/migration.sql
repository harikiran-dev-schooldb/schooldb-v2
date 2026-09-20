ALTER TABLE "SupportTicket"
  ALTER COLUMN "createdById" DROP NOT NULL,
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'STAFF',
  ADD COLUMN "parentName" TEXT,
  ADD COLUMN "parentPhone" TEXT;

ALTER TABLE "SupportTicket" DROP CONSTRAINT "SupportTicket_createdById_fkey";
ALTER TABLE "SupportTicket" ADD CONSTRAINT "SupportTicket_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "SupportTicket_schoolId_source_createdAt_idx"
  ON "SupportTicket"("schoolId", "source", "createdAt" DESC);
