import { prisma } from "@/lib/prisma";

export type BulkFeePaymentRow = {
  admissionNo: string;
  paymentDate: string;
  amount: number;
  paymentMode:
    | "CASH"
    | "UPI"
    | "CARD"
    | "BANK_TRANSFER"
    | "CHEQUE"
    | "ONLINE";
  referenceNo?: string;
  remarks?: string;
};

export type BulkFeePaymentError = {
  row: number;
  message: string;
};

export async function importBulkFeePayments(
  schoolId: string,
  rows: BulkFeePaymentRow[],
) {
  const errors: BulkFeePaymentError[] = [];
  let created = 0;

  if (rows.length > 1000) {
    throw new Error("Maximum 1,000 payment rows can be imported at once.");
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const rowNumber = index + 2;

      try {
        const enrollment = await tx.studentEnrollment.findFirst({
          where: {
            schoolId,
            active: true,
            student: {
              admissionNo: row.admissionNo,
              schoolId,
            },
          },
        });

        if (!enrollment) {
          throw new Error(`Student with admission number ${row.admissionNo} not found.`);
        }

        if (!Number.isFinite(row.amount) || row.amount <= 0) {
          throw new Error("Payment amount must be greater than zero.");
        }

        const paymentDate = new Date(`${row.paymentDate}T00:00:00.000Z`);
        if (Number.isNaN(paymentDate.getTime())) {
          throw new Error("Payment date is invalid.");
        }

        const installments = await tx.studentFeeInstallment.findMany({
          where: {
            studentFeeItem: {
              studentFee: {
                schoolId,
                studentEnrollmentId: enrollment.id,
                active: true,
              },
            },
            status: { in: ["PENDING", "PARTIAL"] },
          },
          orderBy: [{ dueDate: "asc" }, { sequence: "asc" }],
        });

        let remaining = row.amount;
        const allocations: Array<{
          studentFeeInstallmentId: string;
          amount: number;
        }> = [];

        for (const installment of installments) {
          if (remaining <= 0.005) break;

          const balance = Math.max(
            0,
            Number(installment.payableAmount) - Number(installment.paidAmount),
          );

          if (balance <= 0) continue;

          const allocationAmount = Math.min(remaining, balance);
          allocations.push({
            studentFeeInstallmentId: installment.id,
            amount: allocationAmount,
          });
          remaining -= allocationAmount;
        }

        if (remaining > 0.005) {
          throw new Error(
            `Payment exceeds the student's outstanding fee balance by ₹${remaining.toFixed(2)}.`,
          );
        }

        if (!allocations.length) {
          throw new Error("No outstanding fee installments found for this student.");
        }

        const receiptNo = `FEE-BULK-${Date.now()}-${index + 1}`;

        await tx.feePayment.create({
          data: {
            schoolId,
            studentEnrollmentId: enrollment.id,
            receiptNo,
            paymentDate,
            amount: row.amount,
            paymentMode: row.paymentMode,
            referenceNo: row.referenceNo || null,
            remarks: row.remarks || null,
            status: "SUCCESS",
            allocations: { create: allocations },
          },
        });

        for (const allocation of allocations) {
          const installment = await tx.studentFeeInstallment.findUnique({
            where: { id: allocation.studentFeeInstallmentId },
          });

          if (!installment) {
            throw new Error("Fee installment was not found during import.");
          }

          const newPaidAmount = Number(installment.paidAmount) + allocation.amount;
          const payableAmount = Number(installment.payableAmount);

          await tx.studentFeeInstallment.update({
            where: { id: installment.id },
            data: {
              paidAmount: newPaidAmount,
              status: newPaidAmount >= payableAmount ? "PAID" : "PARTIAL",
            },
          });
        }

        created += 1;
      } catch (error) {
        errors.push({
          row: rowNumber,
          message: error instanceof Error ? error.message : "Payment import failed.",
        });
      }
    }
  });

  return {
    created,
    failed: errors.length,
    errors,
  };
}
