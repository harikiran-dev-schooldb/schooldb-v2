CREATE TYPE "ReportExportStatus" AS ENUM ('QUEUED', 'PROCESSING', 'READY', 'FAILED', 'EXPIRED');

CREATE TYPE "ReportExportType" AS ENUM ('ANALYTICS_CSV');

CREATE TABLE "ReportExportJob" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "requestedByUserId" TEXT NOT NULL,
    "type" "ReportExportType" NOT NULL DEFAULT 'ANALYTICS_CSV',
    "status" "ReportExportStatus" NOT NULL DEFAULT 'QUEUED',
    "filters" JSONB NOT NULL,
    "filename" TEXT,
    "contentType" TEXT,
    "storageKey" TEXT,
    "rowCount" INTEGER,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExportJob_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReportExportJob_schoolId_createdAt_idx" ON "ReportExportJob"("schoolId", "createdAt" DESC);
CREATE INDEX "ReportExportJob_status_createdAt_idx" ON "ReportExportJob"("status", "createdAt");
CREATE INDEX "ReportExportJob_requestedByUserId_createdAt_idx" ON "ReportExportJob"("requestedByUserId", "createdAt" DESC);

ALTER TABLE "ReportExportJob" ADD CONSTRAINT "ReportExportJob_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ReportExportJob" ADD CONSTRAINT "ReportExportJob_requestedByUserId_fkey"
FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
