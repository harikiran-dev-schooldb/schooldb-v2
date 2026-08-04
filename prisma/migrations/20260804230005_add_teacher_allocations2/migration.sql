/*
  Warnings:

  - A unique constraint covering the columns `[schoolId,academicYearId,teacherId,subjectId,classId,sectionId]` on the table `TeacherAllocation` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "TeacherAllocation_academicYearId_teacherId_subjectId_classI_key";

-- CreateIndex
CREATE UNIQUE INDEX "TeacherAllocation_schoolId_academicYearId_teacherId_subject_key" ON "TeacherAllocation"("schoolId", "academicYearId", "teacherId", "subjectId", "classId", "sectionId");
