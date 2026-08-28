CREATE TABLE "ClassSubject" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "academicYearId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "subjectId" TEXT NOT NULL,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ClassSubject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassSubject_academicYearId_classId_subjectId_key"
  ON "ClassSubject"("academicYearId", "classId", "subjectId");

CREATE INDEX "ClassSubject_schoolId_idx"
  ON "ClassSubject"("schoolId");

CREATE INDEX "ClassSubject_academicYearId_classId_idx"
  ON "ClassSubject"("academicYearId", "classId");

CREATE INDEX "ClassSubject_subjectId_idx"
  ON "ClassSubject"("subjectId");

ALTER TABLE "ClassSubject"
  ADD CONSTRAINT "ClassSubject_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassSubject"
  ADD CONSTRAINT "ClassSubject_academicYearId_fkey"
  FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassSubject"
  ADD CONSTRAINT "ClassSubject_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassSubject"
  ADD CONSTRAINT "ClassSubject_subjectId_fkey"
  FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;
