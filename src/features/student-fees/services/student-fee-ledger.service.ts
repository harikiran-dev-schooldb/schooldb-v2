import { prisma } from "@/lib/prisma";

export const studentFeeLedgerService = {
  async get(
    studentFeeId: string,
    schoolId: string,
  ) {
    const studentFee =
      await prisma.studentFee.findFirst({
        where: {
          id: studentFeeId,
          schoolId,
          active: true,
        },

        include: {
          studentEnrollment: {
            include: {
              student: true,
              class: true,
              section: true,
              academicYear: true,
            },
          },

          feePlan: true,

          items: {
            include: {
              feeCategory: true,

              installments: {
                orderBy: {
                  sequence: "asc",
                },
              },
            },
          },
        },
      });

    if (!studentFee) {
      return null;
    }

    /*
     * Get all successful payments belonging
     * to this student fee through installment
     * allocations.
     */
    const payments =
      await prisma.feePayment.findMany({
        where: {
          schoolId,

          studentEnrollmentId:
            studentFee.studentEnrollmentId,

          status: "SUCCESS",

          allocations: {
            some: {
              studentFeeInstallment: {
                studentFeeItem: {
                  studentFeeId,
                },
              },
            },
          },
        },

        include: {
          allocations: {
            where: {
              studentFeeInstallment: {
                studentFeeItem: {
                  studentFeeId,
                },
              },
            },

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
        },

        orderBy: {
          paymentDate: "desc",
        },
      });

    let total = 0;
    let concession = 0;
    let paid = 0;

    /*
     * Convert all installments into a flat array.
     */
    const installments =
  studentFee.items.flatMap((item) =>
    item.installments.map((installment) => {
      const amount =
        Number(installment.amount);

      const installmentConcession =
        Number(installment.concession);

      const payableAmount =
        Number(installment.payableAmount);

      const paidAmount =
        Number(installment.paidAmount);

      total += amount;

      concession +=
        installmentConcession;

      paid += paidAmount;

      return {
        id: installment.id,

        feeCategory: {
          id: item.feeCategory.id,
          name: item.feeCategory.name,
          code: item.feeCategory.code,
        },

        name: installment.name,

        amount,

        concession:
          installmentConcession,

        payableAmount,

        paidAmount,

        outstanding: Math.max(
          payableAmount - paidAmount,
          0,
        ),

        dueDate: installment.dueDate,

        status: installment.status,

        sequence: installment.sequence,

        periodStart:
          installment.periodStart,

        periodEnd:
          installment.periodEnd,
      };
    }),
  );

/*
 * First sort by academic period/date.
 * Then sort Quarter 1, Quarter 2, Quarter 3, etc.
 */
installments.sort((a, b) => {
  const aDate = a.periodStart
    ? new Date(a.periodStart).getTime()
    : new Date(a.dueDate).getTime();

  const bDate = b.periodStart
    ? new Date(b.periodStart).getTime()
    : new Date(b.dueDate).getTime();

  const dateDifference =
    aDate - bDate;

  if (dateDifference !== 0) {
    return dateDifference;
  }

  return a.sequence - b.sequence;
});
    

    const outstanding =
      Math.max(
        total -
          concession -
          paid,
        0,
      );

    return {
      studentFee: {
        id: studentFee.id,

        studentEnrollmentId:
          studentFee.studentEnrollmentId,

        feePlan: {
          id: studentFee.feePlan.id,

          name:
            studentFee.feePlan.name,

          academicYearId:
            studentFee.feePlan.academicYearId,
        },

        assignedAt:
          studentFee.assignedAt,
      },

      student: {
        id:
          studentFee.studentEnrollment
            .student.id,

        admissionNo:
          studentFee.studentEnrollment
            .student.admissionNo,

        fullName:
          studentFee.studentEnrollment
            .student.fullName,

        class: {
          id:
            studentFee.studentEnrollment
              .class.id,

          name:
            studentFee.studentEnrollment
              .class.name,
        },

        section: {
          id:
            studentFee.studentEnrollment
              .section.id,

          name:
            studentFee.studentEnrollment
              .section.name,
        },
      },

      academicYear:
        studentFee.studentEnrollment
          .academicYear,

      summary: {
        total,
        concession,
        paid,
        outstanding,
      },

      installments,

      payments: payments.map(
        (payment) => ({
          id: payment.id,

          receiptNo:
            payment.receiptNo,

          paymentDate:
            payment.paymentDate,

          amount:
            Number(payment.amount),

          paymentMode:
            payment.paymentMode,

          referenceNo:
            payment.referenceNo,

          remarks:
            payment.remarks,

          status:
            payment.status,

          allocations:
            payment.allocations.map(
              (allocation) => ({
                installmentId:
                  allocation
                    .studentFeeInstallment
                    .id,

                installmentName:
                  allocation
                    .studentFeeInstallment
                    .name,

                amount:
                  Number(
                    allocation.amount,
                  ),

                feeCategory:
                  allocation
                    .studentFeeInstallment
                    .studentFeeItem
                    .feeCategory
                    .name,
              }),
            ),
        }),
      ),
    };
  },
};