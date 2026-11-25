
CREATE TYPE "AdmissionReviewStage" AS ENUM ('NOT_REQUIRED','PENDING','SCHEDULED','PASSED','FAILED');
CREATE TYPE "AdmissionEnquiryState" AS ENUM ('OPEN','LINKED','CLOSED');
ALTER TABLE "AdmissionApplication"
 ADD COLUMN "entranceStage" "AdmissionReviewStage" NOT NULL DEFAULT 'NOT_REQUIRED',
 ADD COLUMN "entranceAt" TIMESTAMP(3), ADD COLUMN "entranceMemberId" TEXT,
 ADD COLUMN "interviewStage" "AdmissionReviewStage" NOT NULL DEFAULT 'NOT_REQUIRED',
 ADD COLUMN "interviewAt" TIMESTAMP(3), ADD COLUMN "interviewMemberId" TEXT;
CREATE TABLE "AdmissionEnquiry" (
 "id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL,
 "academicYearId" TEXT NOT NULL, "classId" TEXT NOT NULL, "studentName" TEXT NOT NULL,
 "parentName" TEXT NOT NULL, "mobile" TEXT NOT NULL, "dob" DATE, "source" TEXT NOT NULL,
 "notes" TEXT, "state" "AdmissionEnquiryState" NOT NULL DEFAULT 'OPEN', "applicationId" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "AdmissionEnquiry_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AdmissionEnquiry_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AdmissionEnquiry_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
 CONSTRAINT "AdmissionEnquiry_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AdmissionEnquiry_applicationId_key" ON "AdmissionEnquiry"("applicationId");
CREATE INDEX "AdmissionEnquiry_schoolId_state_createdAt_idx" ON "AdmissionEnquiry"("schoolId","state","createdAt");
CREATE INDEX "AdmissionEnquiry_schoolId_academicYearId_mobile_idx" ON "AdmissionEnquiry"("schoolId","academicYearId","mobile");
CREATE TABLE "AdmissionContactTask" (
 "id" TEXT NOT NULL PRIMARY KEY, "schoolId" TEXT NOT NULL, "applicationId" TEXT, "enquiryId" TEXT,
 "assignedMemberId" TEXT NOT NULL, "assignedName" TEXT NOT NULL, "dueAt" TIMESTAMP(3) NOT NULL,
 "note" TEXT NOT NULL, "outcome" TEXT, "completionNote" TEXT, "completedAt" TIMESTAMP(3),
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "AdmissionContactTask_one_target" CHECK (num_nonnulls("applicationId","enquiryId") = 1),
 CONSTRAINT "AdmissionContactTask_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AdmissionContactTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "AdmissionApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 CONSTRAINT "AdmissionContactTask_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "AdmissionEnquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AdmissionContactTask_schoolId_completedAt_dueAt_idx" ON "AdmissionContactTask"("schoolId","completedAt","dueAt");
CREATE INDEX "AdmissionContactTask_applicationId_dueAt_idx" ON "AdmissionContactTask"("applicationId","dueAt");
CREATE INDEX "AdmissionContactTask_enquiryId_dueAt_idx" ON "AdmissionContactTask"("enquiryId","dueAt");
