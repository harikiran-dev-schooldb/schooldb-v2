-- AlterTable
ALTER TABLE "Timetable" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true;

-- CreateIndex
CREATE INDEX "Timetable_academicYearId_idx" ON "Timetable"("academicYearId");

-- CreateIndex
CREATE INDEX "Timetable_teacherAllocationId_idx" ON "Timetable"("teacherAllocationId");

-- CreateIndex
CREATE INDEX "Timetable_periodId_idx" ON "Timetable"("periodId");
