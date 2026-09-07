ALTER TABLE "Student"
ADD COLUMN "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "whatsappOptInAt" TIMESTAMP(3);

ALTER TABLE "WhatsappCampaign"
ADD COLUMN "automatic" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "automationKey" TEXT,
ADD COLUMN "sourceType" TEXT,
ADD COLUMN "sourceId" TEXT;

CREATE UNIQUE INDEX "WhatsappCampaign_schoolId_automationKey_key"
ON "WhatsappCampaign"("schoolId", "automationKey");

CREATE INDEX "WhatsappCampaign_schoolId_automatic_status_scheduledAt_idx"
ON "WhatsappCampaign"("schoolId", "automatic", "status", "scheduledAt");
