ALTER TABLE "School" ADD COLUMN "supportAutomation" JSONB;
ALTER TABLE "SupportTicket" ADD COLUMN "slaEscalatedAt" TIMESTAMP(3);
CREATE INDEX "SupportTicket_schoolId_slaEscalatedAt_status_createdAt_idx" ON "SupportTicket"("schoolId", "slaEscalatedAt", "status", "createdAt");
