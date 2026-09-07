CREATE TYPE "WhatsappCampaignStatus" AS ENUM ('QUEUED', 'SENDING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED');
CREATE TYPE "WhatsappRecipientStatus" AS ENUM ('QUEUED', 'SENDING', 'SENT', 'FAILED', 'CANCELLED');

CREATE TABLE "WhatsappCampaign" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT,
  "targetLabel" TEXT NOT NULL,
  "status" "WhatsappCampaignStatus" NOT NULL DEFAULT 'QUEUED',
  "recipientCount" INTEGER NOT NULL DEFAULT 0,
  "sentCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappCampaign_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WhatsappRecipient" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "campaignId" TEXT NOT NULL,
  "studentId" TEXT,
  "recipientName" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "status" "WhatsappRecipientStatus" NOT NULL DEFAULT 'QUEUED',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "providerMessageId" TEXT,
  "errorMessage" TEXT,
  "lastAttemptAt" TIMESTAMP(3),
  "sentAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WhatsappRecipient_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WhatsappCampaign_schoolId_createdAt_idx" ON "WhatsappCampaign"("schoolId", "createdAt");
CREATE INDEX "WhatsappCampaign_schoolId_status_scheduledAt_idx" ON "WhatsappCampaign"("schoolId", "status", "scheduledAt");
CREATE UNIQUE INDEX "WhatsappRecipient_campaignId_phone_key" ON "WhatsappRecipient"("campaignId", "phone");
CREATE INDEX "WhatsappRecipient_schoolId_status_createdAt_idx" ON "WhatsappRecipient"("schoolId", "status", "createdAt");
CREATE INDEX "WhatsappRecipient_campaignId_status_idx" ON "WhatsappRecipient"("campaignId", "status");
CREATE INDEX "WhatsappRecipient_studentId_idx" ON "WhatsappRecipient"("studentId");

ALTER TABLE "WhatsappCampaign" ADD CONSTRAINT "WhatsappCampaign_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsappRecipient" ADD CONSTRAINT "WhatsappRecipient_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsappRecipient" ADD CONSTRAINT "WhatsappRecipient_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "WhatsappCampaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WhatsappRecipient" ADD CONSTRAINT "WhatsappRecipient_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
