ALTER TABLE "Exam"
ADD COLUMN "resultsLockedAt" TIMESTAMP(3),
ADD COLUMN "resultsLockedBy" TEXT,
ADD COLUMN "resultsVersion" INTEGER NOT NULL DEFAULT 1;

UPDATE "Exam"
SET "resultsLockedAt" = "updatedAt"
WHERE "status" = 'COMPLETED';
