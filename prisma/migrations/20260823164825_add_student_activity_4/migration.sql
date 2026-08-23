/*
  Warnings:

  - You are about to drop the column `performedByUserId` on the `StudentActivity` table. All the data in the column will be lost.
  - You are about to drop the column `studentEnrollmentId` on the `StudentActivity` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "StudentActivity" DROP CONSTRAINT "StudentActivity_studentEnrollmentId_fkey";

-- DropIndex
DROP INDEX "StudentActivity_schoolId_createdAt_idx";

-- DropIndex
DROP INDEX "StudentActivity_studentId_createdAt_idx";

-- AlterTable
ALTER TABLE "StudentActivity" DROP COLUMN "performedByUserId",
DROP COLUMN "studentEnrollmentId",
ADD COLUMN     "enrollmentId" TEXT;

-- CreateIndex
CREATE INDEX "StudentActivity_enrollmentId_idx" ON "StudentActivity"("enrollmentId");

-- CreateIndex
CREATE INDEX "StudentActivity_createdAt_idx" ON "StudentActivity"("createdAt");

-- AddForeignKey
ALTER TABLE "StudentActivity" ADD CONSTRAINT "StudentActivity_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
