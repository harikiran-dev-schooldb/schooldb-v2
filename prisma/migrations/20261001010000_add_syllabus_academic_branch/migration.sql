-- Create the configurable syllabus layer for each school.
CREATE TABLE "Syllabus" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Syllabus_pkey" PRIMARY KEY ("id")
);

-- Academic branches are divisions such as KG, Primary, Secondary, and
-- Higher Secondary within a syllabus.
CREATE TABLE "AcademicBranch" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "syllabusId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicBranch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Syllabus_schoolId_name_key" ON "Syllabus"("schoolId", "name");
CREATE INDEX "Syllabus_schoolId_active_displayOrder_idx" ON "Syllabus"("schoolId", "active", "displayOrder");
CREATE UNIQUE INDEX "AcademicBranch_syllabusId_name_key" ON "AcademicBranch"("syllabusId", "name");
CREATE INDEX "AcademicBranch_schoolId_syllabusId_active_displayOrder_idx" ON "AcademicBranch"("schoolId", "syllabusId", "active", "displayOrder");

ALTER TABLE "Syllabus"
  ADD CONSTRAINT "Syllabus_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademicBranch"
  ADD CONSTRAINT "AcademicBranch_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AcademicBranch"
  ADD CONSTRAINT "AcademicBranch_syllabusId_fkey"
  FOREIGN KEY ("syllabusId") REFERENCES "Syllabus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Preserve every existing class by placing it in an editable default
-- syllabus and branch for its school.
INSERT INTO "Syllabus" (
  "id", "schoolId", "name", "code", "description", "displayOrder", "active", "createdAt", "updatedAt"
)
SELECT
  'default_syllabus_' || md5("id"),
  "id",
  'General',
  'GENERAL',
  'Default syllabus created while upgrading the academic structure.',
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "School";

INSERT INTO "AcademicBranch" (
  "id", "schoolId", "syllabusId", "name", "code", "description", "displayOrder", "active", "createdAt", "updatedAt"
)
SELECT
  'default_branch_' || md5(s."id"),
  s."id",
  sy."id",
  'General',
  'GENERAL',
  'Default branch created while upgrading the academic structure.',
  0,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
FROM "School" s
JOIN "Syllabus" sy ON sy."schoolId" = s."id" AND sy."name" = 'General';

ALTER TABLE "Class" ADD COLUMN "branchId" TEXT;

UPDATE "Class" c
SET "branchId" = b."id"
FROM "AcademicBranch" b
WHERE b."schoolId" = c."schoolId" AND b."name" = 'General';

ALTER TABLE "Class" ALTER COLUMN "branchId" SET NOT NULL;
DROP INDEX "Class_schoolId_name_key";
CREATE UNIQUE INDEX "Class_branchId_name_key" ON "Class"("branchId", "name");
CREATE INDEX "Class_schoolId_branchId_idx" ON "Class"("schoolId", "branchId");

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "AcademicBranch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
