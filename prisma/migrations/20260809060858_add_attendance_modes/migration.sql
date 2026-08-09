-- CreateEnum
CREATE TYPE "AttendanceMode" AS ENUM ('ONCE_DAILY', 'MORNING_AFTERNOON', 'EVERY_PERIOD');

-- CreateEnum
CREATE TYPE "AttendanceSessionType" AS ENUM ('DAILY', 'MORNING', 'AFTERNOON', 'PERIOD');

-- DropForeignKey
ALTER TABLE "AttendanceSession" DROP CONSTRAINT "AttendanceSession_periodId_fkey";

-- DropIndex
DROP INDEX "AttendanceSession_schoolId_academicYearId_classId_sectionId_key";

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "attendanceMode" "AttendanceMode" NOT NULL DEFAULT 'ONCE_DAILY';

-- AlterTable
ALTER TABLE "AttendanceSession" ADD COLUMN     "sessionType" "AttendanceSessionType",
ALTER COLUMN "periodId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "AttendanceSession_schoolId_academicYearId_classId_sectionId_idx" ON "AttendanceSession"("schoolId", "academicYearId", "classId", "sectionId", "attendanceDate");

-- AddForeignKey
ALTER TABLE "AttendanceSession" ADD CONSTRAINT "AttendanceSession_periodId_fkey" FOREIGN KEY ("periodId") REFERENCES "Period"("id") ON DELETE SET NULL ON UPDATE CASCADE;
