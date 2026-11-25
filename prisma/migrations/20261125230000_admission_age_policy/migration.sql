-- Optional, school-scoped rules. Existing academic years and applications remain unchanged.
ALTER TABLE "AcademicYear" ADD COLUMN "admissionAgePolicy" JSONB;
