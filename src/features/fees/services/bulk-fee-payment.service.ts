import { prisma } from "@/lib/prisma";

export type BulkFeePaymentRow = {
  admissionNo: string;
  paymentDate: string;
  amount: number;
  paymentMode: "CASH" | "UPI" | "CARD" | "BANK_TRANSFER" | "CHEQUE" | "ONLINE";
  referenceNo?: string;
  remarks?: string;
};

export type BulkFeePaymentError = {
  row: number;
  message: string;
};

const MAX_BATCH_SIZE = 100;

/**
 * Avoid floating-point precision problems when working with money.
 */
function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Generate a reasonably unique receipt number for bulk imports.
 */
function createReceiptNo(index: number) {
  return [
    "FEE",
    "BULK",
    Date.now(),
    crypto.randomUUID().slice(0, 8).toUpperCase(),
    index + 1,
  ].join("-");
}

export async function importBulkFeePayments(
  schoolId: string,
  rows: BulkFeePaymentRow[],
) {
  if (rows.length > MAX_BATCH_SIZE) {
    throw new Error(
      `Maximum ${MAX_BATCH_SIZE} payment rows can be processed per batch.`,
    );
  }

  const errors: BulkFeePaymentError[] = [];
  let created = 0;

  /*
   * Process each payment independently.
   *
   * Important:
   * We intentionally DO NOT wrap the entire batch in one transaction.
   *
   * Each individual payment gets its own transaction so:
   *
   * - one payment remains atomic
   * - one bad row does not roll back other payments
   * - we avoid a long-running 500-row transaction
   * - Prisma's interactive transaction timeout is much less likely
   */
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    const rowNumber = index + 2;

    try {
      /*
       * -----------------------------------------------------
       * Basic validation before opening transaction
       * -----------------------------------------------------
       */

      const admissionNo = row.admissionNo?.trim();

      if (!admissionNo) {
        throw new Error("Admission number is required.");
      }

      if (!Number.isFinite(row.amount) || row.amount <= 0) {
        throw new Error("Payment amount must be greater than zero.");
      }

      const amount = money(row.amount);

      const paymentDate = new Date(`${row.paymentDate}T00:00:00.000Z`);

      if (Number.isNaN(paymentDate.getTime())) {
        throw new Error("Payment date is invalid.");
      }

      const referenceNo = row.referenceNo?.trim() || null;

      const remarks = row.remarks?.trim() || null;

      /*
       * -----------------------------------------------------
       * ONE payment = ONE transaction
       * -----------------------------------------------------
       */

      await prisma.$transaction(
        async (tx) => {
          /*
           * Find active enrollment.
           */
          const enrollment = await tx.studentEnrollment.findFirst({
            where: {
              schoolId,
              active: true,

              student: {
                admissionNo,
                schoolId,
              },
            },

            select: {
              id: true,
            },
          });

          if (!enrollment) {
            throw new Error(
              `Student with admission number ${admissionNo} not found.`,
            );
          }

          /*
           * Get outstanding installments in oldest-first order.
           */
          const installments = await tx.studentFeeInstallment.findMany({
            where: {
              studentFeeItem: {
                studentFee: {
                  schoolId,
                  studentEnrollmentId: enrollment.id,
                  active: true,
                },
              },

              status: {
                in: ["PENDING", "PARTIAL"],
              },
            },

            select: {
              id: true,
              payableAmount: true,
              paidAmount: true,
              dueDate: true,
              sequence: true,
            },

            orderBy: [
              {
                dueDate: "asc",
              },
              {
                sequence: "asc",
              },
            ],
          });

          if (!installments.length) {
            throw new Error(
              "No outstanding fee installments found for this student.",
            );
          }

          /*
           * -------------------------------------------------
           * Calculate allocation plan in memory
           * -------------------------------------------------
           */

          let remaining = amount;

          const allocations: Array<{
            studentFeeInstallmentId: string;
            amount: number;

            /*
             * Store resulting values so we do NOT need
             * another findUnique query later.
             */
            newPaidAmount: number;
            payableAmount: number;
          }> = [];

          for (const installment of installments) {
            if (remaining <= 0.005) {
              break;
            }

            const payableAmount = money(Number(installment.payableAmount));

            const currentPaidAmount = money(Number(installment.paidAmount));

            const balance = money(
              Math.max(0, payableAmount - currentPaidAmount),
            );

            if (balance <= 0) {
              continue;
            }

            const allocationAmount = money(Math.min(remaining, balance));

            allocations.push({
              studentFeeInstallmentId: installment.id,

              amount: allocationAmount,

              newPaidAmount: money(currentPaidAmount + allocationAmount),

              payableAmount,
            });

            remaining = money(remaining - allocationAmount);
          }

          /*
           * Payment cannot exceed outstanding balance.
           */
          if (remaining > 0.005) {
            throw new Error(
              `Payment exceeds the student's outstanding fee balance by ₹${remaining.toFixed(
                2,
              )}.`,
            );
          }

          if (!allocations.length) {
            throw new Error(
              "No outstanding fee installments found for this student.",
            );
          }

          /*
           * -------------------------------------------------
           * Create payment + allocation records
           * -------------------------------------------------
           */

          const receiptNo = createReceiptNo(index);

          await tx.feePayment.create({
            data: {
              schoolId,

              studentEnrollmentId: enrollment.id,

              receiptNo,

              paymentDate,

              amount,

              paymentMode: row.paymentMode,

              referenceNo,

              remarks,

              status: "SUCCESS",

              allocations: {
                create: allocations.map((allocation) => ({
                  studentFeeInstallmentId: allocation.studentFeeInstallmentId,

                  amount: allocation.amount,
                })),
              },
            },
          });

          /*
           * -------------------------------------------------
           * Update affected installments
           * -------------------------------------------------
           *
           * No findUnique calls are necessary here.
           * We already calculated the new values above.
           */

          for (const allocation of allocations) {
            await tx.studentFeeInstallment.update({
              where: {
                id: allocation.studentFeeInstallmentId,
              },

              data: {
                paidAmount: allocation.newPaidAmount,

                status:
                  allocation.newPaidAmount >= allocation.payableAmount - 0.005
                    ? "PAID"
                    : "PARTIAL",
              },
            });
          }
        },

        /*
         * Individual transactions should normally complete
         * very quickly. 15 seconds gives Neon some headroom
         * without creating one giant long-running transaction.
         */
        {
          maxWait: 10_000,
          timeout: 15_000,
        },
      );

      created += 1;
    } catch (error) {
      errors.push({
        row: rowNumber,

        message:
          error instanceof Error ? error.message : "Payment import failed.",
      });
    }
  }

  return {
    created,
    failed: errors.length,
    errors,
  };
}
