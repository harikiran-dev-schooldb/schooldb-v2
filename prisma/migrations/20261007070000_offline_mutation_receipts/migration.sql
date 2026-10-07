CREATE TABLE "OfflineMutationReceipt" (
    "id" UUID NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" VARCHAR(160) NOT NULL,
    "status" VARCHAR(24) NOT NULL DEFAULT 'PROCESSING',
    "result" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "OfflineMutationReceipt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "OfflineMutationReceipt_schoolId_userId_createdAt_idx"
ON "OfflineMutationReceipt"("schoolId", "userId", "createdAt" DESC);

CREATE INDEX "OfflineMutationReceipt_status_updatedAt_idx"
ON "OfflineMutationReceipt"("status", "updatedAt");
