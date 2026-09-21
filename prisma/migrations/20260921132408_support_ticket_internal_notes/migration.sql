-- Support ticket staff-only notes
ALTER TABLE "SupportTicketMessage"
ADD COLUMN "isInternal" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "SupportTicketMessage_ticketId_isInternal_createdAt_idx"
ON "SupportTicketMessage"("ticketId", "isInternal", "createdAt");
