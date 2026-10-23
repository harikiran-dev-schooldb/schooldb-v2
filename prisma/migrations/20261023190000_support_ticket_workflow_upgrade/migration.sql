ALTER TABLE "SupportTicket"
ADD COLUMN "labels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
ADD COLUMN "duplicateOfId" TEXT;

CREATE INDEX "SupportTicket_schoolId_duplicateOfId_idx"
ON "SupportTicket"("schoolId", "duplicateOfId");

ALTER TABLE "SupportTicket"
ADD CONSTRAINT "SupportTicket_duplicateOfId_fkey"
FOREIGN KEY ("duplicateOfId") REFERENCES "SupportTicket"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
