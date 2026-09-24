CREATE TABLE "AndroidAppBuild" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'QUEUED',
    "configuration" JSONB NOT NULL,
    "logoBytes" BYTEA,
    "firebaseConfig" JSONB,
    "callbackTokenHash" TEXT NOT NULL,
    "githubRunId" TEXT,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "AndroidAppBuild_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AndroidAppBuild_schoolId_createdAt_idx"
ON "AndroidAppBuild"("schoolId", "createdAt" DESC);

CREATE INDEX "AndroidAppBuild_status_createdAt_idx"
ON "AndroidAppBuild"("status", "createdAt");

CREATE INDEX "AndroidAppBuild_requestedById_idx"
ON "AndroidAppBuild"("requestedById");

ALTER TABLE "AndroidAppBuild"
ADD CONSTRAINT "AndroidAppBuild_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AndroidAppBuild"
ADD CONSTRAINT "AndroidAppBuild_requestedById_fkey"
FOREIGN KEY ("requestedById") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
