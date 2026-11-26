ALTER TABLE "AdmissionApplication" ADD COLUMN "documentReviewRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "AdmissionDocument" ADD COLUMN "reviewStatus" TEXT NOT NULL DEFAULT 'PENDING', ADD COLUMN "reviewedAt" TIMESTAMP(3), ADD COLUMN "reviewedBy" TEXT, ADD COLUMN "reviewNote" TEXT;
ALTER TABLE "AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_reviewStatus_check" CHECK ("reviewStatus" IN ('PENDING','VERIFIED','REJECTED'));
