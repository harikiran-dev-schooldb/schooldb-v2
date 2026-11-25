ALTER TABLE "AcademicYear" ADD COLUMN "admissionPlanning" JSONB, ADD COLUMN "admissionPublicEnquiriesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TYPE "AdmissionEnquiryState" ADD VALUE 'PENDING';
ALTER TYPE "AdmissionEnquiryState" ADD VALUE 'DISMISSED';
ALTER TABLE "AdmissionEnquiry" ADD COLUMN "consentAt" TIMESTAMP(3);
