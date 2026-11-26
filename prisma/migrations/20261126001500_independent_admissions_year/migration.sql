ALTER TABLE "AcademicYear" ADD COLUMN "admissionsEnabled" BOOLEAN NOT NULL DEFAULT false;
-- Preserve current admissions and make already-created future years available
-- internally without activating their teaching year or publishing public forms.
UPDATE "AcademicYear" AS y SET "admissionsEnabled" = true
WHERE y.active = true OR EXISTS (
 SELECT 1 FROM "AcademicYear" AS current_year
 WHERE current_year."schoolId" = y."schoolId" AND current_year.active = true
 AND y."startDate" > current_year."startDate"
);
