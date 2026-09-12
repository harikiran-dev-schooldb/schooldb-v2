CREATE TYPE "CashfreePaymentOrderStatus" AS ENUM (
  'CREATED',
  'ACTIVE',
  'PAID',
  'FAILED',
  'EXPIRED',
  'REVIEW_REQUIRED'
);

CREATE TABLE "CashfreePaymentOrder" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "studentEnrollmentId" TEXT NOT NULL,
  "providerOrderId" TEXT NOT NULL,
  "providerPaymentId" TEXT,
  "idempotencyKey" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "status" "CashfreePaymentOrderStatus" NOT NULL DEFAULT 'CREATED',
  "paymentSessionId" TEXT,
  "requestedByUserId" TEXT NOT NULL,
  "feePaymentId" TEXT,
  "failureReason" VARCHAR(500),
  "paidAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "CashfreePaymentOrder_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CashfreePaymentAllocation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "studentFeeInstallmentId" TEXT NOT NULL,
  "amount" DECIMAL(12,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CashfreePaymentAllocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashfreePaymentOrder_providerOrderId_key" ON "CashfreePaymentOrder"("providerOrderId");
CREATE UNIQUE INDEX "CashfreePaymentOrder_providerPaymentId_key" ON "CashfreePaymentOrder"("providerPaymentId");
CREATE UNIQUE INDEX "CashfreePaymentOrder_idempotencyKey_key" ON "CashfreePaymentOrder"("idempotencyKey");
CREATE UNIQUE INDEX "CashfreePaymentOrder_feePaymentId_key" ON "CashfreePaymentOrder"("feePaymentId");
CREATE INDEX "CashfreePaymentOrder_schoolId_status_createdAt_idx" ON "CashfreePaymentOrder"("schoolId", "status", "createdAt" DESC);
CREATE INDEX "CashfreePaymentOrder_studentEnrollmentId_status_createdAt_idx" ON "CashfreePaymentOrder"("studentEnrollmentId", "status", "createdAt" DESC);
CREATE UNIQUE INDEX "CashfreePaymentAllocation_orderId_studentFeeInstallmentId_key" ON "CashfreePaymentAllocation"("orderId", "studentFeeInstallmentId");
CREATE INDEX "CashfreePaymentAllocation_studentFeeInstallmentId_idx" ON "CashfreePaymentAllocation"("studentFeeInstallmentId");

ALTER TABLE "CashfreePaymentOrder" ADD CONSTRAINT "CashfreePaymentOrder_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashfreePaymentOrder" ADD CONSTRAINT "CashfreePaymentOrder_studentEnrollmentId_fkey"
  FOREIGN KEY ("studentEnrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "CashfreePaymentOrder" ADD CONSTRAINT "CashfreePaymentOrder_feePaymentId_fkey"
  FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CashfreePaymentAllocation" ADD CONSTRAINT "CashfreePaymentAllocation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "CashfreePaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashfreePaymentAllocation" ADD CONSTRAINT "CashfreePaymentAllocation_studentFeeInstallmentId_fkey"
  FOREIGN KEY ("studentFeeInstallmentId") REFERENCES "StudentFeeInstallment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
