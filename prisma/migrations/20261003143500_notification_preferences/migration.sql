CREATE TABLE "NotificationPreference" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "announcements" BOOLEAN NOT NULL DEFAULT true,
  "homework" BOOLEAN NOT NULL DEFAULT true,
  "attendance" BOOLEAN NOT NULL DEFAULT true,
  "fees" BOOLEAN NOT NULL DEFAULT true,
  "exams" BOOLEAN NOT NULL DEFAULT true,
  "leaveUpdates" BOOLEAN NOT NULL DEFAULT true,
  "urgent" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_schoolId_userId_key"
ON "NotificationPreference"("schoolId", "userId");

CREATE INDEX "NotificationPreference_userId_idx"
ON "NotificationPreference"("userId");

ALTER TABLE "NotificationPreference"
ADD CONSTRAINT "NotificationPreference_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference"
ADD CONSTRAINT "NotificationPreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LeaveRequest" ADD COLUMN "clientRequestId" TEXT;
CREATE UNIQUE INDEX "LeaveRequest_clientRequestId_key" ON "LeaveRequest"("clientRequestId");
