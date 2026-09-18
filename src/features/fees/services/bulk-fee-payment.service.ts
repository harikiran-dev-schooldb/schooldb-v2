import { prisma } from "@/lib/prisma";

export type BulkFeePaymentRow = {
  admissionNo: string;

  /**
   * Exact StudentFeeInstallment.name.
   *
   * Examples:
   * Term 1
   * Term 2
   * Quarter 1
   * June
   */
  installmentName: string;

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
 * Generate a unique receipt number for bulk imports.
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

/**
 * Normalize text for reliable installment-name comparison.
 *
 * Examples:
 * " Term 1 " -> "term 1"
 * "TERM 1"   -> "term 1"
 */
function normalizeText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
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
   * Each CSV payment is processed independently.
   *
   * One payment = one transaction.
   *
   * This prevents:
   * - one bad row rolling back the whole batch
   * - long-running 100-row interactive transactions
   * - transaction timeout problems
   */
  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];

    const rowNumber = index + 2;

    try {
      /*
       * -----------------------------------------------------
       * Basic validation
       * -----------------------------------------------------
       */

      const admissionNo = row.admissionNo?.trim();

      if (!admissionNo) {
        throw new Error("Admission number is required.");
      }

      const installmentName = row.installmentName?.trim();

      if (!installmentName) {
        throw new Error("Installment name is required.");
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
       * ONE PAYMENT = ONE TRANSACTION
       * -----------------------------------------------------
       */

      await prisma.$transaction(
        async (tx) => {
          /*
           * -------------------------------------------------
           * Find student's active enrollment
           * -------------------------------------------------
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
           * -------------------------------------------------
           * Find installments belonging to this student
           * -------------------------------------------------
           *
           * We intentionally load the installment names and
           * perform normalized matching below.
           *
           * This makes:
           *
           * Term 1
           * TERM 1
           * term 1
           *
           * equivalent for CSV imports.
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
            },

            select: {
              id: true,
              name: true,
              payableAmount: true,
              paidAmount: true,
              status: true,
              sequence: true,

              studentFeeItem: {
                select: {
                  id: true,

                  studentFee: {
                    select: {
                      id: true,
                    },
                  },
                },
              },
            },
          });

          /*
           * Find exact requested installment.
           */
          const requestedName = normalizeText(installmentName);

          const matchingInstallments = installments.filter(
            (installment) => normalizeText(installment.name) === requestedName,
          );

          /*
           * Nothing matched.
           */
          if (matchingInstallments.length === 0) {
            const availableNames = [
              ...new Set(
                installments
                  .map((installment) => installment.name)
                  .filter(Boolean),
              ),
            ];

            throw new Error(
              availableNames.length
                ? `Installment "${installmentName}" not found. Available: ${availableNames.join(
                    ", ",
                  )}.`
                : `Installment "${installmentName}" not found for this student.`,
            );
          }

          /*
           * Important safety check.
           *
           * A student could theoretically have multiple fee plans
           * containing an installment called "Term 1".
           *
           * We must NOT guess which one should receive the payment.
           */
          if (matchingInstallments.length > 1) {
            throw new Error(
              `Multiple installments named "${installmentName}" were found for admission number ${admissionNo}. The payment cannot be allocated safely.`,
            );
          }

          const installment = matchingInstallments[0];

          /*
           * -------------------------------------------------
           * Calculate current installment balance
           * -------------------------------------------------
           */

          const payableAmount = money(Number(installment.payableAmount));

          const currentPaidAmount = money(Number(installment.paidAmount));

          const outstanding = money(
            Math.max(0, payableAmount - currentPaidAmount),
          );

          /*
           * -------------------------------------------------
           * Duplicate / already-paid protection
           * -------------------------------------------------
           *
           * This is the critical behavior for re-uploading
           * the same CSV.
           *
           * If Term 1 is already paid, we reject Term 1.
           *
           * We DO NOT automatically move the money to Term 2.
           */

          if (installment.status === "PAID" || outstanding <= 0.005) {
            throw new Error(`${installment.name} is already fully paid.`);
          }

          /*
           * Do not allow the CSV payment to exceed the
           * requested installment's remaining balance.
           */

          if (amount > outstanding + 0.005) {
            throw new Error(
              `${installment.name} has only ₹${outstanding.toFixed(
                2,
              )} outstanding, but the CSV payment is ₹${amount.toFixed(2)}.`,
            );
          }

          /*
           * -------------------------------------------------
           * Optional duplicate reference-number protection
           * -------------------------------------------------
           *
           * UPI / bank / online payments usually have a
           * transaction/reference number.
           *
           * If the same reference number already exists for
           * this school, reject it.
           *
           * CASH payments usually have no reference number,
           * so installment balance protection still applies.
           */

          if (referenceNo) {
            const existingReference = await tx.feePayment.findFirst({
              where: {
                schoolId,
                referenceNo,
                status: "SUCCESS",
              },

              select: {
                id: true,
                receiptNo: true,
              },
            });

            if (existingReference) {
              throw new Error(
                `Reference number "${referenceNo}" has already been used in receipt ${existingReference.receiptNo}.`,
              );
            }
          }

          /*
           * -------------------------------------------------
           * Calculate new installment state
           * -------------------------------------------------
           */

          const newPaidAmount = money(currentPaidAmount + amount);

          const newStatus =
            newPaidAmount >= payableAmount - 0.005 ? "PAID" : "PARTIAL";

          /*
           * -------------------------------------------------
           * Create FeePayment + exact allocation
           * -------------------------------------------------
           *
           * IMPORTANT:
           *
           * There is exactly ONE allocation.
           *
           * The payment cannot spill into another term.
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
                create: {
                  studentFeeInstallmentId: installment.id,
                  amount,
                },
              },
            },
          });

          /*
           * -------------------------------------------------
           * Update ONLY the requested installment
           * -------------------------------------------------
           */

          await tx.studentFeeInstallment.update({
            where: {
              id: installment.id,
            },

            data: {
              paidAmount: newPaidAmount,
              status: newStatus,
            },
          });
        },

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
