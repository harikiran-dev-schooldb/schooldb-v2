ALTER TABLE "WhatsappCampaign"
ADD COLUMN "deliveredCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "readCount" INTEGER NOT NULL DEFAULT 0;

ALTER TYPE "WhatsappRecipientStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "WhatsappRecipientStatus" ADD VALUE 'READ';

ALTER TABLE "WhatsappRecipient"
ADD COLUMN "deliveredAt" TIMESTAMP(3),
ADD COLUMN "readAt" TIMESTAMP(3),
ADD COLUMN "failedAt" TIMESTAMP(3),
ADD COLUMN "providerStatusAt" TIMESTAMP(3);

CREATE UNIQUE INDEX "WhatsappRecipient_providerMessageId_key"
ON "WhatsappRecipient"("providerMessageId");
