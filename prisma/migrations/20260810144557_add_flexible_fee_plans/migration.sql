/*
  Warnings:

  - You are about to drop the column `classId` on the `FeePlan` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schoolId,academicYearId,name]` on the table `FeePlan` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "FeePlan" DROP CONSTRAINT "FeePlan_classId_fkey";

-- DropIndex
DROP INDEX "FeePlan_schoolId_classId_idx";

-- AlterTable
ALTER TABLE "FeePlan" DROP COLUMN "classId",
ADD COLUMN     "appliesToAllClasses" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FeePlanClass" (
    "id" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeePlanClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeePlanClass_classId_idx" ON "FeePlanClass"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePlanClass_feePlanId_classId_key" ON "FeePlanClass"("feePlanId", "classId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePlan_schoolId_academicYearId_name_key" ON "FeePlan"("schoolId", "academicYearId", "name");

-- AddForeignKey
ALTER TABLE "FeePlanClass" ADD CONSTRAINT "FeePlanClass_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanClass" ADD CONSTRAINT "FeePlanClass_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
