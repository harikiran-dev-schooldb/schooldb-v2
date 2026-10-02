CREATE TABLE "ClassTeacherAssignment" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassTeacherAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ClassTeacherAssignment_schoolId_academicYearId_classId_sectionId_key"
ON "ClassTeacherAssignment"("schoolId", "academicYearId", "classId", "sectionId");

CREATE INDEX "ClassTeacherAssignment_schoolId_active_academicYearId_idx"
ON "ClassTeacherAssignment"("schoolId", "active", "academicYearId");

CREATE INDEX "ClassTeacherAssignment_schoolId_teacherId_active_idx"
ON "ClassTeacherAssignment"("schoolId", "teacherId", "active");

ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ClassTeacherAssignment"
ADD CONSTRAINT "ClassTeacherAssignment_sectionId_fkey"
FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
