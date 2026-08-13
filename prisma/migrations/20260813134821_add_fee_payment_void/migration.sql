-- AlterEnum
ALTER TYPE "FeePaymentStatus" ADD VALUE 'VOID';

-- AlterTable
ALTER TABLE "FeePayment" ADD COLUMN     "voidReason" TEXT,
ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;
