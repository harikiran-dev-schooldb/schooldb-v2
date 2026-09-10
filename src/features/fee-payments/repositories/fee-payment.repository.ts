import { randomBytes } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import { runSerializableTransaction } from "@/lib/prisma-transaction";
import type { FeePaymentInput } from "../schemas/fee-payment.schema";

export const feePaymentRepository = {
  async create(
    schoolId: string,
    input: FeePaymentInput,
  ) {
    return runSerializableTransaction(async (tx) => {
      const enrollment =
        await tx.studentEnrollment.findFirst({
          where: {
            id: input.studentEnrollmentId,
            schoolId,
            active: true,
          },
        });

      if (!enrollment) {
        throw new Error(
          "Student enrollment not found.",
        );
      }

      const installmentIds =
        input.allocations.map(
          (item) =>
            item.studentFeeInstallmentId,
        );

      const installments =
        await tx.studentFeeInstallment.findMany({
          where: {
            id: {
              in: installmentIds,
            },

            studentFeeItem: {
              studentFee: {
                schoolId,
                studentEnrollmentId:
                  input.studentEnrollmentId,
                active: true,
              },
            },
          },

          include: {
            studentFeeItem: {
              include: {
                studentFee: true,
                feeCategory: true,
              },
            },
          },
        });

      if (
        installments.length !==
        installmentIds.length
      ) {
        throw new Error(
          "One or more fee installments were not found for this student.",
        );
      }

      let totalAmount = 0;

      const allocationData =
        input.allocations.map(
          (allocation) => {
            const installment =
              installments.find(
                (item) =>
                  item.id ===
                  allocation.studentFeeInstallmentId,
              );

            if (!installment) {
              throw new Error(
                "Fee installment not found.",
              );
            }

            const payable = new Prisma.Decimal(installment.payableAmount);
            const paid = new Prisma.Decimal(installment.paidAmount);
            const amount = new Prisma.Decimal(allocation.amount);
            const balance = payable.minus(paid);

            if (
              amount.greaterThan(balance)
            ) {
              throw new Error(
                `Payment amount exceeds the balance for ${installment.name}.`,
              );
            }

            totalAmount +=
              allocation.amount;

            return {
              studentFeeInstallmentId:
                allocation.studentFeeInstallmentId,

              amount:
                allocation.amount,
            };
          },
        );

      if (totalAmount <= 0) {
        throw new Error(
          "Payment amount must be greater than zero.",
        );
      }

      /*
       * Simple unique receipt number.
       *
       * Later we can replace this with a proper
       * school-wise sequential receipt counter.
       */
      const receiptNo = `FEE-${Date.now()}-${randomBytes(6).toString("hex").toUpperCase()}`;

      const payment =
        await tx.feePayment.create({
          data: {
            schoolId,

            studentEnrollmentId:
              input.studentEnrollmentId,

            receiptNo,

            paymentDate:
              new Date(input.paymentDate),

            amount: totalAmount,

            paymentMode:
              input.paymentMode,

            referenceNo:
              input.referenceNo || null,

            remarks:
              input.remarks || null,

            status: "SUCCESS",

            allocations: {
              create: allocationData,
            },
          },

          include: {
            allocations: {
              include: {
                studentFeeInstallment: {
                  include: {
                    studentFeeItem: {
                      include: {
                        feeCategory: true,
                      },
                    },
                  },
                },
              },
            },

            studentEnrollment: {
              include: {
                student: true,
                class: true,
                section: true,
                academicYear: true,
              },
            },
          },
        });

      /*
       * Update every affected installment.
       */
      for (
        const allocation of
          input.allocations
      ) {
        const installment =
          installments.find(
            (item) =>
              item.id ===
              allocation.studentFeeInstallmentId,
          );

        if (!installment) {
          continue;
        }

        const newPaidAmount = new Prisma.Decimal(installment.paidAmount).plus(
          allocation.amount,
        );

        const payableAmount = new Prisma.Decimal(installment.payableAmount);

        const status =
          newPaidAmount.greaterThanOrEqualTo(payableAmount)
            ? "PAID"
            : "PARTIAL";

        await tx.studentFeeInstallment.update(
          {
            where: {
              id: installment.id,
            },

            data: {
              paidAmount:
                newPaidAmount,

              status,
            },
          },
        );
      }

      return payment;
    });
  },

  async void(
  schoolId: string,
  paymentId: string,
  reason: string,
  voidedBy: string,
) {
  return runSerializableTransaction(async (tx) => {
    const payment =
      await tx.feePayment.findFirst({
        where: {
          id: paymentId,
          schoolId,
        },
        include: {
          allocations: {
            include: {
              studentFeeInstallment: true,
            },
          },
        },
      });

    if (!payment) {
      throw new Error("Payment not found.");
    }

    if (payment.status === "VOID") {
      throw new Error(
        "This payment has already been voided.",
      );
    }

    if (payment.status !== "SUCCESS") {
      throw new Error(
        "Only successful payments can be voided.",
      );
    }

    // Reverse every payment allocation
    for (const allocation of payment.allocations) {
      const installment =
        allocation.studentFeeInstallment;

      const newPaidAmount = Prisma.Decimal.max(
        0,
        new Prisma.Decimal(installment.paidAmount).minus(allocation.amount),
      );

      const payableAmount = new Prisma.Decimal(installment.payableAmount);

      const status =
        newPaidAmount.lessThanOrEqualTo(0)
          ? "PENDING"
          : newPaidAmount.lessThan(payableAmount)
            ? "PARTIAL"
            : "PAID";

      await tx.studentFeeInstallment.update({
        where: {
          id: installment.id,
        },
        data: {
          paidAmount: newPaidAmount,
          status,
        },
      });
    }

    return tx.feePayment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "VOID",
        voidReason: reason,
        voidedAt: new Date(),
        voidedBy,
      },
    });
  });
},
};
