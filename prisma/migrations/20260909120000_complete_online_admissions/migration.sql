CREATE TYPE "AdmissionDocumentType" AS ENUM ('PHOTO', 'BIRTH_CERTIFICATE', 'AADHAAR', 'PREVIOUS_REPORT_CARD', 'TRANSFER_CERTIFICATE', 'OTHER');

CREATE TABLE "AdmissionDocument" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "type" "AdmissionDocumentType" NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "storageKey" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdmissionDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SchoolAdmissionSetting" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "automaticNumbering" BOOLEAN NOT NULL DEFAULT false,
  "admissionPrefix" TEXT NOT NULL DEFAULT '',
  "nextNumber" INTEGER NOT NULL DEFAULT 1,
  "numberPadding" INTEGER NOT NULL DEFAULT 4,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SchoolAdmissionSetting_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdmissionDocument_storageKey_key" ON "AdmissionDocument"("storageKey");
CREATE INDEX "AdmissionDocument_schoolId_applicationId_createdAt_idx" ON "AdmissionDocument"("schoolId", "applicationId", "createdAt");
CREATE UNIQUE INDEX "SchoolAdmissionSetting_schoolId_key" ON "SchoolAdmissionSetting"("schoolId");
CREATE INDEX "SchoolAdmissionSetting_schoolId_idx" ON "SchoolAdmissionSetting"("schoolId");

ALTER TABLE "AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdmissionDocument" ADD CONSTRAINT "AdmissionDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SchoolAdmissionSetting" ADD CONSTRAINT "SchoolAdmissionSetting_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
