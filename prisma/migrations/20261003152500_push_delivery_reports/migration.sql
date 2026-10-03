CREATE TABLE "PushDeliveryReport" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "announcementId" TEXT,
  "initiatedByUserId" TEXT,
  "kind" TEXT NOT NULL DEFAULT 'ANNOUNCEMENT',
  "title" TEXT NOT NULL,
  "audienceUsers" INTEGER NOT NULL DEFAULT 0,
  "preferenceEnabledUsers" INTEGER NOT NULL DEFAULT 0,
  "eligibleDevices" INTEGER NOT NULL DEFAULT 0,
  "noDeviceUsers" INTEGER NOT NULL DEFAULT 0,
  "iosDevices" INTEGER NOT NULL DEFAULT 0,
  "standardWebDevices" INTEGER NOT NULL DEFAULT 0,
  "firebaseDevices" INTEGER NOT NULL DEFAULT 0,
  "accepted" INTEGER NOT NULL DEFAULT 0,
  "failed" INTEGER NOT NULL DEFAULT 0,
  "invalidDevices" INTEGER NOT NULL DEFAULT 0,
  "status" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PushDeliveryReport_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PushDeliveryReport_schoolId_createdAt_idx"
ON "PushDeliveryReport"("schoolId", "createdAt");

CREATE INDEX "PushDeliveryReport_schoolId_announcementId_idx"
ON "PushDeliveryReport"("schoolId", "announcementId");

CREATE INDEX "PushDeliveryReport_initiatedByUserId_createdAt_idx"
ON "PushDeliveryReport"("initiatedByUserId", "createdAt");

ALTER TABLE "PushDeliveryReport"
ADD CONSTRAINT "PushDeliveryReport_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PushDeliveryReport"
ADD CONSTRAINT "PushDeliveryReport_initiatedByUserId_fkey"
FOREIGN KEY ("initiatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
