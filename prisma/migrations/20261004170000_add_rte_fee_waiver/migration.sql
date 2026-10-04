ALTER TABLE "StudentFeeItem"
ADD COLUMN "rteWaiver" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "StudentFeeInstallment"
ADD COLUMN "rteWaiver" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- Preserve completed payment history. Only unpaid installments are converted
-- into RTE waivers when this migration is introduced.
UPDATE "StudentFeeInstallment" AS installment
SET
  "rteWaiver" = GREATEST(installment."amount" - installment."concession", 0),
  "payableAmount" = 0,
  "status" = 'WAIVED'
FROM "StudentFeeItem" AS item
JOIN "StudentFee" AS fee ON fee."id" = item."studentFeeId"
JOIN "StudentEnrollment" AS enrollment ON enrollment."id" = fee."studentEnrollmentId"
JOIN "Student" AS student ON student."id" = enrollment."studentId"
WHERE installment."studentFeeItemId" = item."id"
  AND student."isRte" = TRUE
  AND installment."paidAmount" = 0;

UPDATE "StudentFeeItem" AS item
SET
  "rteWaiver" = totals."rteWaiver",
  "finalAmount" = GREATEST(item."amount" - item."concession" - totals."rteWaiver", 0)
FROM (
  SELECT
    "studentFeeItemId",
    COALESCE(SUM("rteWaiver"), 0) AS "rteWaiver"
  FROM "StudentFeeInstallment"
  GROUP BY "studentFeeItemId"
) AS totals
WHERE totals."studentFeeItemId" = item."id";
