CREATE TYPE "CashfreePaymentInitiator" AS ENUM ('SELF_SERVICE', 'STAFF_QR');

ALTER TABLE "CashfreePaymentOrder"
ADD COLUMN "publicTokenHash" TEXT,
ADD COLUMN "initiatedBy" "CashfreePaymentInitiator" NOT NULL DEFAULT 'SELF_SERVICE';

CREATE UNIQUE INDEX "CashfreePaymentOrder_publicTokenHash_key"
ON "CashfreePaymentOrder"("publicTokenHash");
