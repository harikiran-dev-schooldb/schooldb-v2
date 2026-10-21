DROP INDEX IF EXISTS "PushDeliveryJob_status_nextAttemptAt_idx";
DROP INDEX IF EXISTS "PushDevice_schoolId_enabled_idx";

CREATE INDEX "PushDeliveryJob_status_nextAttemptAt_createdAt_idx"
ON "PushDeliveryJob"("status", "nextAttemptAt", "createdAt");

CREATE INDEX "PushDeliveryJob_status_startedAt_idx"
ON "PushDeliveryJob"("status", "startedAt");

CREATE INDEX "PushDevice_schoolId_enabled_userId_idx"
ON "PushDevice"("schoolId", "enabled", "userId");
