CREATE TYPE "LeaveRequestType" AS ENUM ('LEAVE', 'LATE_ARRIVAL', 'EARLY_DEPARTURE', 'HALF_DAY', 'PERMISSION');

ALTER TABLE "LeaveRequest"
ADD COLUMN "requestType" "LeaveRequestType" NOT NULL DEFAULT 'LEAVE',
ADD COLUMN "startTime" TEXT,
ADD COLUMN "endTime" TEXT;

CREATE INDEX "LeaveRequest_schoolId_requestType_startDate_idx"
ON "LeaveRequest"("schoolId", "requestType", "startDate");
