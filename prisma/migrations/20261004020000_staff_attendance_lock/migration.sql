ALTER TABLE "StaffAttendance"
ADD COLUMN "lockedAt" TIMESTAMP(3),
ADD COLUMN "lockedBy" TEXT;

CREATE INDEX "StaffAttendance_schoolId_date_lockedAt_idx"
ON "StaffAttendance"("schoolId", "date", "lockedAt");
