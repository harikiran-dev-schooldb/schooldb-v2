-- AlterTable
ALTER TABLE "SupportTicket" ADD COLUMN     "diagnostics" JSONB;

-- CreateTable
CREATE TABLE "SupportTicketAttachment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SupportTicketAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupportTicketAttachment_storageKey_key" ON "SupportTicketAttachment"("storageKey");

-- CreateIndex
CREATE INDEX "SupportTicketAttachment_schoolId_ticketId_createdAt_idx" ON "SupportTicketAttachment"("schoolId", "ticketId", "createdAt");

-- CreateIndex
CREATE INDEX "SupportTicketAttachment_uploadedById_createdAt_idx" ON "SupportTicketAttachment"("uploadedById", "createdAt");

-- AddForeignKey
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "SupportTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupportTicketAttachment" ADD CONSTRAINT "SupportTicketAttachment_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "DirectUpiPaymentAllocation_submissionId_studentFeeInstallmentId" RENAME TO "DirectUpiPaymentAllocation_submissionId_studentFeeInstallme_key";

-- RenameIndex
ALTER INDEX "DirectUpiPaymentSubmission_studentEnrollmentId_status_createdAt" RENAME TO "DirectUpiPaymentSubmission_studentEnrollmentId_status_creat_idx";
