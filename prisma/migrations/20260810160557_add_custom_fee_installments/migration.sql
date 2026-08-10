-- CreateTable
CREATE TABLE "FeePlanCustomInstallment" (
    "id" TEXT NOT NULL,
    "feePlanItemId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "dueDate" DATE NOT NULL,
    "sequence" INTEGER NOT NULL,
    "periodStart" DATE,
    "periodEnd" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeePlanCustomInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeePlanCustomInstallment_feePlanItemId_idx" ON "FeePlanCustomInstallment"("feePlanItemId");

-- CreateIndex
CREATE UNIQUE INDEX "FeePlanCustomInstallment_feePlanItemId_sequence_key" ON "FeePlanCustomInstallment"("feePlanItemId", "sequence");

-- AddForeignKey
ALTER TABLE "FeePlanCustomInstallment" ADD CONSTRAINT "FeePlanCustomInstallment_feePlanItemId_fkey" FOREIGN KEY ("feePlanItemId") REFERENCES "FeePlanItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
