CREATE TYPE "PushDeliveryJobStatus" AS ENUM ('QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED');

CREATE TABLE "PushDeliveryJob" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "announcementId" TEXT NOT NULL,
    "status" "PushDeliveryJobStatus" NOT NULL DEFAULT 'QUEUED',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PushDeliveryJob_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PushDeliveryJob_announcementId_key"
ON "PushDeliveryJob"("announcementId");

CREATE INDEX "PushDeliveryJob_status_nextAttemptAt_idx"
ON "PushDeliveryJob"("status", "nextAttemptAt");

CREATE INDEX "PushDeliveryJob_schoolId_createdAt_idx"
ON "PushDeliveryJob"("schoolId", "createdAt" DESC);

ALTER TABLE "PushDeliveryJob" ADD CONSTRAINT "PushDeliveryJob_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushDeliveryJob" ADD CONSTRAINT "PushDeliveryJob_announcementId_fkey"
FOREIGN KEY ("announcementId") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;
