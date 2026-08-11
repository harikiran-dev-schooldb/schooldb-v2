import { prisma } from "@/lib/prisma";
import type { FeePaymentInput } from "../schemas/fee-payment.schema";

export const feePaymentRepository = {
  async create(
    schoolId: string,
    input: FeePaymentInput,
  ) {
    return prisma.$transaction(async (tx) => {
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

            const payable =
              Number(
                installment.payableAmount,
              );

            const paid =
              Number(
                installment.paidAmount,
              );

            const balance =
              payable - paid;

            if (
              allocation.amount >
              balance
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
      const receiptNo =
        `FEE-${Date.now()}-${Math.floor(
          Math.random() * 1000,
        )
          .toString()
          .padStart(3, "0")}`;

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

        const newPaidAmount =
          Number(
            installment.paidAmount,
          ) +
          allocation.amount;

        const payableAmount =
          Number(
            installment.payableAmount,
          );

        const status =
          newPaidAmount >=
          payableAmount
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
};