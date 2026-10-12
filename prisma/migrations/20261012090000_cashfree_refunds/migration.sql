CREATE TYPE "CashfreeRefundStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');
ALTER TYPE "StudentActivityType" ADD VALUE 'FEE_PAYMENT_REFUNDED';

CREATE TABLE "CashfreeRefund" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "feePaymentId" TEXT NOT NULL,
    "providerRefundId" TEXT NOT NULL,
    "cashfreeRefundId" TEXT,
    "amount" DECIMAL(12,2) NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "status" "CashfreeRefundStatus" NOT NULL DEFAULT 'PENDING',
    "statusDescription" VARCHAR(500),
    "refundArn" VARCHAR(120),
    "initiatedByUserId" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3),
    "lastReconciledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "CashfreeRefund_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CashfreeRefund_providerRefundId_key" ON "CashfreeRefund"("providerRefundId");
CREATE UNIQUE INDEX "CashfreeRefund_cashfreeRefundId_key" ON "CashfreeRefund"("cashfreeRefundId");
CREATE INDEX "CashfreeRefund_schoolId_status_createdAt_idx" ON "CashfreeRefund"("schoolId", "status", "createdAt" DESC);
CREATE INDEX "CashfreeRefund_orderId_status_idx" ON "CashfreeRefund"("orderId", "status");
CREATE INDEX "CashfreeRefund_feePaymentId_idx" ON "CashfreeRefund"("feePaymentId");

ALTER TABLE "CashfreeRefund" ADD CONSTRAINT "CashfreeRefund_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashfreeRefund" ADD CONSTRAINT "CashfreeRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CashfreePaymentOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CashfreeRefund" ADD CONSTRAINT "CashfreeRefund_feePaymentId_fkey" FOREIGN KEY ("feePaymentId") REFERENCES "FeePayment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
