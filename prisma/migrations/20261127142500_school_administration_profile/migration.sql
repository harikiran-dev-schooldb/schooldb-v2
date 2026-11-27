CREATE TABLE "SchoolAdministrationProfile" (
  "schoolId" TEXT NOT NULL,
  "profile" JSONB NOT NULL,
  CONSTRAINT "SchoolAdministrationProfile_pkey" PRIMARY KEY ("schoolId"),
  CONSTRAINT "SchoolAdministrationProfile_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
ALTER TABLE "SchoolAdmissionSetting" ADD COLUMN "admissionEventAlertsEnabled" BOOLEAN NOT NULL DEFAULT false;
