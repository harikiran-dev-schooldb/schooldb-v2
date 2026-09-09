CREATE TYPE "AdmissionApplicationStatus" AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'UNDER_REVIEW',
  'APPROVED',
  'WAITLISTED',
  'REJECTED',
  'CONVERTED'
);

CREATE TABLE "AdmissionApplication" (
  "id" TEXT NOT NULL,
  "applicationNo" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "applyingClassId" TEXT NOT NULL,
  "preferredSectionId" TEXT,
  "studentId" TEXT,
  "studentName" TEXT NOT NULL,
  "gender" "Gender" NOT NULL,
  "dob" DATE NOT NULL,
  "studentAadhar" TEXT,
  "apaarId" TEXT,
  "previousSchool" TEXT,
  "fatherName" TEXT,
  "fatherPhone" TEXT,
  "motherName" TEXT,
  "motherPhone" TEXT,
  "guardianName" TEXT,
  "guardianPhone" TEXT,
  "guardianRelation" TEXT,
  "email" TEXT,
  "address" TEXT,
  "city" TEXT,
  "district" TEXT,
  "state" TEXT,
  "pincode" TEXT,
  "medicalConditions" TEXT,
  "transportRequired" BOOLEAN NOT NULL DEFAULT false,
  "whatsappOptIn" BOOLEAN NOT NULL DEFAULT false,
  "status" "AdmissionApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "notes" TEXT,
  "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP(3),
  "convertedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "AdmissionApplication_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AdmissionStatusHistory" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "fromStatus" "AdmissionApplicationStatus",
  "toStatus" "AdmissionApplicationStatus" NOT NULL,
  "note" TEXT,
  "changedBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdmissionStatusHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdmissionApplication_schoolId_applicationNo_key" ON "AdmissionApplication"("schoolId", "applicationNo");
CREATE INDEX "AdmissionApplication_schoolId_status_submittedAt_idx" ON "AdmissionApplication"("schoolId", "status", "submittedAt" DESC);
CREATE INDEX "AdmissionApplication_schoolId_academicYearId_applyingClassId_status_idx" ON "AdmissionApplication"("schoolId", "academicYearId", "applyingClassId", "status");
CREATE INDEX "AdmissionApplication_schoolId_fatherPhone_idx" ON "AdmissionApplication"("schoolId", "fatherPhone");
CREATE INDEX "AdmissionApplication_schoolId_motherPhone_idx" ON "AdmissionApplication"("schoolId", "motherPhone");
CREATE INDEX "AdmissionApplication_schoolId_guardianPhone_idx" ON "AdmissionApplication"("schoolId", "guardianPhone");
CREATE INDEX "AdmissionApplication_schoolId_studentAadhar_idx" ON "AdmissionApplication"("schoolId", "studentAadhar");
CREATE INDEX "AdmissionStatusHistory_applicationId_createdAt_idx" ON "AdmissionStatusHistory"("applicationId", "createdAt" DESC);

ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_applyingClassId_fkey" FOREIGN KEY ("applyingClassId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_preferredSectionId_fkey" FOREIGN KEY ("preferredSectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdmissionApplication" ADD CONSTRAINT "AdmissionApplication_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AdmissionStatusHistory" ADD CONSTRAINT "AdmissionStatusHistory_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE;
