CREATE TYPE "StudentDocumentType" AS ENUM (
  'AADHAAR',
  'BIRTH_CERTIFICATE',
  'PREVIOUS_SCHOOL_RECORD',
  'TRANSFER_CERTIFICATE',
  'MEDICAL_RECORD',
  'STUDENT_PHOTO',
  'OTHER'
);

CREATE TABLE "StudentDocument" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "type" "StudentDocumentType" NOT NULL,
  "name" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "notes" TEXT,
  "visibleToFamily" BOOLEAN NOT NULL DEFAULT false,
  "uploadedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StudentDocument_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentDocument_storageKey_key" ON "StudentDocument"("storageKey");
CREATE INDEX "StudentDocument_schoolId_studentId_createdAt_idx" ON "StudentDocument"("schoolId", "studentId", "createdAt");
CREATE INDEX "StudentDocument_schoolId_visibleToFamily_idx" ON "StudentDocument"("schoolId", "visibleToFamily");

ALTER TABLE "StudentDocument"
  ADD CONSTRAINT "StudentDocument_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "StudentDocument"
  ADD CONSTRAINT "StudentDocument_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;
