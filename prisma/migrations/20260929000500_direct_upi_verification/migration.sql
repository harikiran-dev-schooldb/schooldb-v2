CREATE TYPE "DirectUpiPaymentStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "DirectUpiPaymentSubmission" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentEnrollmentId" TEXT NOT NULL,
    "submittedByUserId" TEXT NOT NULL,
    "utr" VARCHAR(80) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "DirectUpiPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "rejectionReason" VARCHAR(500),
    "reviewedByUserId" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "feePaymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DirectUpiPaymentSubmission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DirectUpiPaymentAllocation" (
    "id" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "studentFeeInstallmentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DirectUpiPaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DirectUpiPaymentSubmission_feePaymentId_key"
ON "DirectUpiPaymentSubmission"("feePaymentId");

CREATE UNIQUE INDEX "DirectUpiPaymentSubmission_schoolId_utr_key"
ON "DirectUpiPaymentSubmission"("schoolId", "utr");

CREATE INDEX "DirectUpiPaymentSubmission_schoolId_status_createdAt_idx"
ON "DirectUpiPaymentSubmission"("schoolId", "status", "createdAt" DESC);

CREATE INDEX "DirectUpiPaymentSubmission_studentEnrollmentId_status_createdAt_idx"
ON "DirectUpiPaymentSubmission"("studentEnrollmentId", "status", "createdAt" DESC);

CREATE INDEX "DirectUpiPaymentSubmission_submittedByUserId_createdAt_idx"
ON "DirectUpiPaymentSubmission"("submittedByUserId", "createdAt" DESC);

CREATE INDEX "DirectUpiPaymentSubmission_reviewedByUserId_reviewedAt_idx"
ON "DirectUpiPaymentSubmission"("reviewedByUserId", "reviewedAt" DESC);

CREATE UNIQUE INDEX "DirectUpiPaymentAllocation_submissionId_studentFeeInstallmentId_key"
ON "DirectUpiPaymentAllocation"("submissionId", "studentFeeInstallmentId");

CREATE INDEX "DirectUpiPaymentAllocation_studentFeeInstallmentId_idx"
ON "DirectUpiPaymentAllocation"("studentFeeInstallmentId");

ALTER TABLE "DirectUpiPaymentSubmission"
ADD CONSTRAINT "DirectUpiPaymentSubmission_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectUpiPaymentSubmission"
ADD CONSTRAINT "DirectUpiPaymentSubmission_studentEnrollmentId_fkey"
FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectUpiPaymentSubmission"
ADD CONSTRAINT "DirectUpiPaymentSubmission_submittedByUserId_fkey"
FOREIGN KEY ("submittedByUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectUpiPaymentSubmission"
ADD CONSTRAINT "DirectUpiPaymentSubmission_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectUpiPaymentSubmission"
ADD CONSTRAINT "DirectUpiPaymentSubmission_feePaymentId_fkey"
FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "DirectUpiPaymentAllocation"
ADD CONSTRAINT "DirectUpiPaymentAllocation_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "DirectUpiPaymentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DirectUpiPaymentAllocation"
ADD CONSTRAINT "DirectUpiPaymentAllocation_studentFeeInstallmentId_fkey"
FOREIGN KEY ("studentFeeInstallmentId") REFERENCES "StudentFeeInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
