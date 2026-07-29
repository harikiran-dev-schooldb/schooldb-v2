/*
  Warnings:

  - You are about to drop the column `firstName` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `image` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `lastName` on the `Student` table. All the data in the column will be lost.
  - You are about to drop the column `mobile` on the `Student` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'TRANSFERRED', 'DROPPED', 'ALUMNI');

-- CreateEnum
CREATE TYPE "Religion" AS ENUM ('HINDU', 'MUSLIM', 'CHRISTIAN', 'SIKH', 'BUDDHIST', 'JAIN', 'OTHER');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('GENERAL', 'OBC', 'BC_A', 'BC_B', 'BC_C', 'BC_D', 'BC_E', 'SC', 'ST', 'EWS', 'RTE');

-- AlterEnum
ALTER TYPE "Gender" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "Student" DROP COLUMN "firstName",
DROP COLUMN "image",
DROP COLUMN "lastName",
DROP COLUMN "mobile",
ADD COLUMN     "academicYearId" TEXT,
ADD COLUMN     "address" TEXT,
ADD COLUMN     "allergies" TEXT,
ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "apaarId" TEXT,
ADD COLUMN     "bloodGroup" TEXT,
ADD COLUMN     "caste" TEXT,
ADD COLUMN     "category" "Category",
ADD COLUMN     "city" TEXT,
ADD COLUMN     "classId" TEXT,
ADD COLUMN     "clerkId" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "doctorName" TEXT,
ADD COLUMN     "doctorPhone" TEXT,
ADD COLUMN     "emisNo" TEXT,
ADD COLUMN     "fatherAadhar" TEXT,
ADD COLUMN     "fatherEmail" TEXT,
ADD COLUMN     "fatherIncome" DECIMAL(65,30),
ADD COLUMN     "fatherName" TEXT,
ADD COLUMN     "fatherOccupation" TEXT,
ADD COLUMN     "fatherPhone" TEXT,
ADD COLUMN     "fatherQualification" TEXT,
ADD COLUMN     "fullName" TEXT,
ADD COLUMN     "guardianName" TEXT,
ADD COLUMN     "guardianPhone" TEXT,
ADD COLUMN     "guardianRelation" TEXT,
ADD COLUMN     "hostelRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "joinedDate" TIMESTAMP(3),
ADD COLUMN     "medicalConditions" TEXT,
ADD COLUMN     "motherAadhar" TEXT,
ADD COLUMN     "motherEmail" TEXT,
ADD COLUMN     "motherIncome" DECIMAL(65,30),
ADD COLUMN     "motherName" TEXT,
ADD COLUMN     "motherOccupation" TEXT,
ADD COLUMN     "motherPhone" TEXT,
ADD COLUMN     "motherQualification" TEXT,
ADD COLUMN     "motherTongue" TEXT,
ADD COLUMN     "nationality" TEXT,
ADD COLUMN     "penNo" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "pincode" TEXT,
ADD COLUMN     "religion" "Religion",
ADD COLUMN     "remarks" TEXT,
ADD COLUMN     "rollNo" TEXT,
ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "state" TEXT,
ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "studentAadhar" TEXT,
ADD COLUMN     "subCaste" TEXT,
ADD COLUMN     "transportRequired" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "Student_status_idx" ON "Student"("status");
