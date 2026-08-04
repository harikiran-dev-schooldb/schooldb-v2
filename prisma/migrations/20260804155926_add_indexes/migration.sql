/*
  Warnings:

  - You are about to drop the column `academicYearId` on the `Student` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[academicYearId,classId,sectionId,rollNo]` on the table `StudentEnrollment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_academicYearId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_classId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_sectionId_fkey";

-- DropForeignKey
ALTER TABLE "StudentEnrollment" DROP CONSTRAINT "StudentEnrollment_studentId_fkey";

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "academicYearId";

-- CreateIndex
CREATE INDEX "Student_schoolId_fullName_idx" ON "Student"("schoolId", "fullName");

-- CreateIndex
CREATE INDEX "Student_schoolId_phone_idx" ON "Student"("schoolId", "phone");

-- CreateIndex
CREATE INDEX "StudentEnrollment_schoolId_active_idx" ON "StudentEnrollment"("schoolId", "active");

-- CreateIndex
CREATE INDEX "StudentEnrollment_academicYearId_classId_sectionId_idx" ON "StudentEnrollment"("academicYearId", "classId", "sectionId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_academicYearId_classId_sectionId_rollNo_key" ON "StudentEnrollment"("academicYearId", "classId", "sectionId", "rollNo");

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentEnrollment" ADD CONSTRAINT "StudentEnrollment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;
