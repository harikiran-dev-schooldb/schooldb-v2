import { prisma } from "@/lib/prisma";

export const studentFeeRepository = {
  findAssignment(
    studentEnrollmentId: string,
    feePlanId: string,
    schoolId: string,
  ) {
    return prisma.studentFee.findFirst({
      where: {
        studentEnrollmentId,
        feePlanId,
        schoolId,
      },

      include: {
        studentEnrollment: {
          include: {
            student: true,
            academicYear: true,
            class: true,
            section: true,
          },
        },

        feePlan: {
          include: {
            academicYear: true,
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
        },

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
  },

  findById(
    id: string,
    schoolId: string,
  ) {
    return prisma.studentFee.findFirst({
      where: {
        id,
        schoolId,
      },

      include: {
        studentEnrollment: {
          include: {
            student: true,
            academicYear: true,
            class: true,
            section: true,
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
  },

  list(schoolId: string) {
    return prisma.studentFee.findMany({
      where: {
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

        feePlan: {
          include: {
            academicYear: true,
          },
        },

        items: {
          include: {
            feeCategory: true,
            installments: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  },

  create(
    schoolId: string,
    studentEnrollmentId: string,
    feePlanId: string,
  ) {
    return prisma.$transaction(async (tx) => {
      const plan =
        await tx.feePlan.findFirst({
          where: {
            id: feePlanId,
            schoolId,
          },

          include: {
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

      if (!plan) {
        throw new Error(
          "Fee plan not found.",
        );
      }

      const enrollment =
        await tx.studentEnrollment.findFirst({
          where: {
            id: studentEnrollmentId,
            schoolId,
            active: true,
          },
        });

      if (!enrollment) {
        throw new Error(
          "Student enrollment not found.",
        );
      }

      if (
        enrollment.academicYearId !==
        plan.academicYearId
      ) {
        throw new Error(
          "Student enrollment and fee plan must belong to the same academic year.",
        );
      }

      const existing =
        await tx.studentFee.findFirst({
          where: {
            studentEnrollmentId,
            feePlanId,
            schoolId,
          },
        });

      if (existing) {
        throw new Error(
          "This fee plan is already assigned to the student.",
        );
      }

      const studentFee =
        await tx.studentFee.create({
          data: {
            schoolId,
            studentEnrollmentId,
            feePlanId,

            items: {
              create: plan.items.map(
                (planItem) => ({
                  feePlanItemId:
                    planItem.id,

                  feeCategoryId:
                    planItem.feeCategoryId,

                  amount:
                    planItem.amount,

                  concession: 0,

                  finalAmount:
                    planItem.amount,

                  installments: {
                    create:
                      planItem.installments.map(
                        (installment) => ({
                          feeInstallmentId:
                            installment.id,

                          name:
                            installment.name,

                          amount:
                            installment.amount,

                          concession: 0,

                          payableAmount:
                            installment.amount,

                          paidAmount: 0,

                          dueDate:
                            installment.dueDate,

                          status:
                            "PENDING",

                          sequence:
                            installment.sequence,

                          periodStart:
                            installment.periodStart,

                          periodEnd:
                            installment.periodEnd,
                        }),
                      ),
                  },
                }),
              ),
            },
          },

          include: {
            studentEnrollment: {
              include: {
                student: true,
                academicYear: true,
                class: true,
                section: true,
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

      return studentFee;
    });
  },
};