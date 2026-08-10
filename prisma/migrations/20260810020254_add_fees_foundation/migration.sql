-- CreateEnum
CREATE TYPE "FeeFrequency" AS ENUM ('MONTHLY', 'QUARTERLY', 'TERMLY', 'HALF_YEARLY', 'ANNUAL', 'CUSTOM');

-- CreateTable
CREATE TABLE "AcademicPeriod" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shortName" TEXT,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeCategory" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePlan" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "classId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeePlanItem" (
    "id" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "feeCategoryId" TEXT NOT NULL,
    "frequency" "FeeFrequency" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlanItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeeInstallment" (
    "id" TEXT NOT NULL,
    "feePlanItemId" TEXT NOT NULL,
    "academicPeriodId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AcademicPeriod_schoolId_academicYearId_idx" ON "AcademicPeriod"("schoolId", "academicYearId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_academicYearId_name_key" ON "AcademicPeriod"("academicYearId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicPeriod_academicYearId_sequence_key" ON "AcademicPeriod"("academicYearId", "sequence");

-- CreateIndex
CREATE INDEX "FeeCategory_schoolId_active_idx" ON "FeeCategory"("schoolId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "FeeCategory_schoolId_name_key" ON "FeeCategory"("schoolId", "name");

-- CreateIndex
CREATE INDEX "FeePlan_schoolId_academicYearId_idx" ON "FeePlan"("schoolId", "academicYearId");

-- CreateIndex
CREATE INDEX "FeePlan_schoolId_classId_idx" ON "FeePlan"("schoolId", "classId");

-- CreateIndex
CREATE INDEX "FeePlanItem_feePlanId_idx" ON "FeePlanItem"("feePlanId");

-- CreateIndex
CREATE INDEX "FeePlanItem_feeCategoryId_idx" ON "FeePlanItem"("feeCategoryId");

-- CreateIndex
CREATE INDEX "FeeInstallment_feePlanItemId_idx" ON "FeeInstallment"("feePlanItemId");

-- CreateIndex
CREATE INDEX "FeeInstallment_academicPeriodId_idx" ON "FeeInstallment"("academicPeriodId");

-- CreateIndex
CREATE INDEX "FeeInstallment_dueDate_idx" ON "FeeInstallment"("dueDate");

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicPeriod" ADD CONSTRAINT "AcademicPeriod_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeCategory" ADD CONSTRAINT "FeeCategory_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlan" ADD CONSTRAINT "FeePlan_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanItem" ADD CONSTRAINT "FeePlanItem_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeePlanItem" ADD CONSTRAINT "FeePlanItem_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "FeeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_feePlanItemId_fkey" FOREIGN KEY ("feePlanItemId") REFERENCES "FeePlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeInstallment" ADD CONSTRAINT "FeeInstallment_academicPeriodId_fkey" FOREIGN KEY ("academicPeriodId") REFERENCES "AcademicPeriod"("id") ON DELETE SET NULL ON UPDATE CASCADE;
