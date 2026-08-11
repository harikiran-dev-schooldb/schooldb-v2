-- CreateEnum
CREATE TYPE "StudentFeeInstallmentStatus" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'WAIVED');

-- CreateTable
CREATE TABLE "StudentFee" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentEnrollmentId" TEXT NOT NULL,
    "feePlanId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "feeCategoryId" TEXT,
    "feePlanItemId" TEXT,
    "feeInstallmentId" TEXT,

    CONSTRAINT "StudentFee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeItem" (
    "id" TEXT NOT NULL,
    "studentFeeId" TEXT NOT NULL,
    "feePlanItemId" TEXT NOT NULL,
    "feeCategoryId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "concession" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentFeeInstallment" (
    "id" TEXT NOT NULL,
    "studentFeeItemId" TEXT NOT NULL,
    "feeInstallmentId" TEXT,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "concession" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "payableAmount" DECIMAL(12,2) NOT NULL,
    "paidAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "dueDate" DATE NOT NULL,
    "status" "StudentFeeInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "sequence" INTEGER NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFeeInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudentFee_schoolId_studentEnrollmentId_idx" ON "StudentFee"("schoolId", "studentEnrollmentId");

-- CreateIndex
CREATE INDEX "StudentFee_feePlanId_idx" ON "StudentFee"("feePlanId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentFee_studentEnrollmentId_feePlanId_key" ON "StudentFee"("studentEnrollmentId", "feePlanId");

-- CreateIndex
CREATE INDEX "StudentFeeItem_studentFeeId_idx" ON "StudentFeeItem"("studentFeeId");

-- CreateIndex
CREATE INDEX "StudentFeeItem_feePlanItemId_idx" ON "StudentFeeItem"("feePlanItemId");

-- CreateIndex
CREATE INDEX "StudentFeeItem_feeCategoryId_idx" ON "StudentFeeItem"("feeCategoryId");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_studentFeeItemId_idx" ON "StudentFeeInstallment"("studentFeeItemId");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_feeInstallmentId_idx" ON "StudentFeeInstallment"("feeInstallmentId");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_dueDate_idx" ON "StudentFeeInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "StudentFeeInstallment_status_idx" ON "StudentFeeInstallment"("status");

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_studentEnrollmentId_fkey" FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feePlanId_fkey" FOREIGN KEY ("feePlanId") REFERENCES "FeePlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "FeeCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feePlanItemId_fkey" FOREIGN KEY ("feePlanItemId") REFERENCES "FeePlanItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFee" ADD CONSTRAINT "StudentFee_feeInstallmentId_fkey" FOREIGN KEY ("feeInstallmentId") REFERENCES "FeeInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeItem" ADD CONSTRAINT "StudentFeeItem_studentFeeId_fkey" FOREIGN KEY ("studentFeeId") REFERENCES "StudentFee"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeItem" ADD CONSTRAINT "StudentFeeItem_feePlanItemId_fkey" FOREIGN KEY ("feePlanItemId") REFERENCES "FeePlanItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeItem" ADD CONSTRAINT "StudentFeeItem_feeCategoryId_fkey" FOREIGN KEY ("feeCategoryId") REFERENCES "FeeCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeInstallment" ADD CONSTRAINT "StudentFeeInstallment_studentFeeItemId_fkey" FOREIGN KEY ("studentFeeItemId") REFERENCES "StudentFeeItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentFeeInstallment" ADD CONSTRAINT "StudentFeeInstallment_feeInstallmentId_fkey" FOREIGN KEY ("feeInstallmentId") REFERENCES "FeeInstallment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
