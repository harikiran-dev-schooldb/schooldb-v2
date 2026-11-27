ALTER TABLE "SupportTicket" ADD COLUMN "followUpAt" TIMESTAMP(3), ADD COLUMN "followUpNotifiedAt" TIMESTAMP(3);
CREATE INDEX "SupportTicket_followUpAt_followUpNotifiedAt_idx" ON "SupportTicket"("followUpAt", "followUpNotifiedAt");
