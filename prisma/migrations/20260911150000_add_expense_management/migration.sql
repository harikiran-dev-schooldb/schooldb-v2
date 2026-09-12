CREATE TYPE "ExpenseStatus" AS ENUM ('POSTED', 'VOID');

CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "description" VARCHAR(240) NOT NULL,
    "vendor" VARCHAR(160),
    "amount" DECIMAL(12,2) NOT NULL,
    "expenseDate" DATE NOT NULL,
    "paymentMode" "FeePaymentMode" NOT NULL,
    "referenceNo" VARCHAR(120),
    "remarks" VARCHAR(1000),
    "status" "ExpenseStatus" NOT NULL DEFAULT 'POSTED',
    "recordedBy" TEXT NOT NULL,
    "voidedAt" TIMESTAMP(3),
    "voidedBy" TEXT,
    "voidReason" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Expense_schoolId_status_expenseDate_idx"
ON "Expense"("schoolId", "status", "expenseDate" DESC);

CREATE INDEX "Expense_schoolId_category_expenseDate_idx"
ON "Expense"("schoolId", "category", "expenseDate" DESC);

ALTER TABLE "Expense"
ADD CONSTRAINT "Expense_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
