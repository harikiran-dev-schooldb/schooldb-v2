import { prisma } from "@/lib/prisma";
import { isRteFeeExempt } from "../rte-fee-policy";

const FEE_ASSIGNMENT_BATCH_SIZE = 250;
const BULK_WRITE_BATCH_SIZE = 500;

function chunkRows<T>(rows: T[], size: number) {
  const chunks: T[][] = [];

  for (let index = 0; index < rows.length; index += size) {
    chunks.push(rows.slice(index, index + size));
  }

  return chunks;
}

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

  list(
  schoolId: string,
  studentId?: string,
) {
  return prisma.studentFee.findMany({
    where: {
      schoolId,
      active: true,

      ...(studentId
        ? {
            studentEnrollment: {
              studentId,
            },
          }
        : {}),
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
    performedByUserId?: string,
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
          select: {
            id: true,
            studentId: true,
            academicYearId: true,
            student: {
              select: {
                isRte: true,
                category: true,
              },
            },
          },
        });

      if (!enrollment) {
        throw new Error(
          "Student enrollment not found.",
        );
      }

      if (isRteFeeExempt(enrollment.student)) {
        throw new Error("Fees cannot be assigned to an RTE student.");
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

      await tx.studentActivity.create({
        data: {
          schoolId,
          studentId: enrollment.studentId,
          enrollmentId: enrollment.id,
          type: "FEE_ASSIGNED",
          title: "Fee plan assigned",
          description: `${plan.name} was assigned to the student.`,
          sourceType: "STUDENT_FEE",
          sourceId: studentFee.id,
          performedByUserId,
          metadata: { studentFeeId: studentFee.id, feePlanId: plan.id },
        },
      });

      return studentFee;
    });
  },

  async applyFeePlanToStudents(
    schoolId: string,
    feePlanId: string,
    performedByUserId?: string,
  ) {
    const plan = await prisma.feePlan.findFirst({
      where: {
        id: feePlanId,
        schoolId,
        active: true,
      },
      select: {
        id: true,
        name: true,
        academicYearId: true,
        appliesToAllClasses: true,
        classes: {
          select: {
            classId: true,
          },
        },
        items: {
          select: {
            id: true,
            feeCategoryId: true,
            amount: true,
            installments: {
              select: {
                id: true,
                name: true,
                amount: true,
                dueDate: true,
                sequence: true,
                periodStart: true,
                periodEnd: true,
              },
              orderBy: {
                sequence: "asc",
              },
            },
          },
        },
      },
    });

    if (!plan) {
      throw new Error("Active fee plan not found.");
    }

    if (plan.items.length === 0) {
      throw new Error("Fee plan has no fee items.");
    }

    if (plan.items.some((item) => item.installments.length === 0)) {
      throw new Error(
        "Generate installments for every fee item before applying this plan.",
      );
    }

    const classIds = plan.classes.map((item) => item.classId);

    if (!plan.appliesToAllClasses && classIds.length === 0) {
      throw new Error("Fee plan is not assigned to any classes.");
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        active: true,
        academicYearId: plan.academicYearId,
        ...(!plan.appliesToAllClasses
          ? {
              classId: {
                in: classIds,
              },
            }
          : {}),
      },
      select: {
        id: true,
        studentId: true,
        student: {
          select: {
            isRte: true,
            category: true,
          },
        },
      },
    });

    const feeEligibleEnrollments = enrollments.filter(
      (enrollment) => !isRteFeeExempt(enrollment.student),
    );
    const rteExcluded = enrollments.length - feeEligibleEnrollments.length;

    if (feeEligibleEnrollments.length === 0) {
      return {
        totalStudents: enrollments.length,
        created: 0,
        existing: 0,
        failed: 0,
        rteExcluded,
      };
    }

    const existingAssignments = await prisma.studentFee.findMany({
      where: {
        feePlanId,
        studentEnrollmentId: {
          in: feeEligibleEnrollments.map((enrollment) => enrollment.id),
        },
      },
      select: {
        studentEnrollmentId: true,
      },
    });

    const existingEnrollmentIds = new Set(
      existingAssignments.map((assignment) => assignment.studentEnrollmentId),
    );

    const pendingEnrollments = feeEligibleEnrollments.filter(
      (enrollment) => !existingEnrollmentIds.has(enrollment.id),
    );

    let created = 0;
    let existing = existingAssignments.length;
    let failed = 0;

    for (const enrollmentBatch of chunkRows(
      pendingEnrollments,
      FEE_ASSIGNMENT_BATCH_SIZE,
    )) {
      try {
        const createdInBatch = await prisma.$transaction(
          async (tx) => {
            const studentFees = await tx.studentFee.createManyAndReturn({
              data: enrollmentBatch.map((enrollment) => ({
                schoolId,
                studentEnrollmentId: enrollment.id,
                feePlanId,
              })),
              skipDuplicates: true,
              select: {
                id: true,
                studentEnrollmentId: true,
              },
            });

            if (studentFees.length === 0) {
              return 0;
            }

            const studentFeeItemRows = studentFees.flatMap((studentFee) =>
              plan.items.map((planItem) => ({
                studentFeeId: studentFee.id,
                feePlanItemId: planItem.id,
                feeCategoryId: planItem.feeCategoryId,
                amount: planItem.amount,
                concession: 0,
                finalAmount: planItem.amount,
              })),
            );

            const studentFeeItems = [];

            for (const itemBatch of chunkRows(
              studentFeeItemRows,
              BULK_WRITE_BATCH_SIZE,
            )) {
              const createdItems =
                await tx.studentFeeItem.createManyAndReturn({
                  data: itemBatch,
                  select: {
                    id: true,
                    studentFeeId: true,
                    feePlanItemId: true,
                  },
                });

              studentFeeItems.push(...createdItems);
            }

            const planItemsById = new Map(
              plan.items.map((item) => [item.id, item]),
            );

            const installmentRows = studentFeeItems.flatMap((studentFeeItem) => {
              const planItem = planItemsById.get(studentFeeItem.feePlanItemId);

              if (!planItem) {
                throw new Error("Fee plan item not found during assignment.");
              }

              return planItem.installments.map((installment) => ({
                studentFeeItemId: studentFeeItem.id,
                feeInstallmentId: installment.id,
                name: installment.name,
                amount: installment.amount,
                concession: 0,
                payableAmount: installment.amount,
                paidAmount: 0,
                dueDate: installment.dueDate,
                status: "PENDING" as const,
                sequence: installment.sequence,
                periodStart: installment.periodStart,
                periodEnd: installment.periodEnd,
              }));
            });

            for (const installmentBatch of chunkRows(
              installmentRows,
              BULK_WRITE_BATCH_SIZE,
            )) {
              await tx.studentFeeInstallment.createMany({
                data: installmentBatch,
              });
            }

            const enrollmentById = new Map(
              enrollmentBatch.map((enrollment) => [enrollment.id, enrollment]),
            );

            await tx.studentActivity.createMany({
              data: studentFees.map((studentFee) => {
                const enrollment = enrollmentById.get(
                  studentFee.studentEnrollmentId,
                );

                if (!enrollment) {
                  throw new Error("Student enrollment not found during assignment.");
                }

                return {
                  schoolId,
                  studentId: enrollment.studentId,
                  enrollmentId: enrollment.id,
                  type: "FEE_ASSIGNED" as const,
                  title: "Fee plan assigned",
                  description: `${plan.name} was assigned to the student.`,
                  sourceType: "STUDENT_FEE",
                  sourceId: studentFee.id,
                  performedByUserId,
                  metadata: {
                    studentFeeId: studentFee.id,
                    feePlanId: plan.id,
                  },
                };
              }),
            });

            return studentFees.length;
          },
          {
            maxWait: 5_000,
            timeout: 30_000,
          },
        );

        created += createdInBatch;
        existing += enrollmentBatch.length - createdInBatch;
      } catch (error) {
        console.error(
          `Failed to apply fee plan to enrollment batch (${enrollmentBatch.length} students)`,
          error,
        );

        failed += enrollmentBatch.length;
      }
    }

    return {
      totalStudents: enrollments.length,
      created,
      existing,
      failed,
      rteExcluded,
    };
  },
};
