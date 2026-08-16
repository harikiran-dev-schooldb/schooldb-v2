import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const studentId = searchParams.get("studentId");

    if (!studentId) {
      return ApiResponse.error("Student ID is required.", 400);
    }

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: tenant.schoolId,
      },

      include: {
        enrollments: {
          where: {
            schoolId: tenant.schoolId,
          },

          orderBy: {
            createdAt: "desc",
          },

          take: 1,
        },
      },
    });

    if (!student) {
      return ApiResponse.error("Student not found.", 404);
    }

    const enrollment = student.enrollments[0];

    if (!enrollment) {
      return ApiResponse.error(
        "No enrollment found for this student.",
        404,
      );
    }

    /*
     * Get all installments for this student.
     *
     * Do not sort only by sequence because:
     *
     * Previous Year Q1 = sequence 1
     * Latest Year Q1   = sequence 1
     *
     * We need to sort by academic year first.
     */
    const installments =
      await prisma.studentFeeInstallment.findMany({
        where: {
          studentFeeItem: {
            studentFee: {
              schoolId: tenant.schoolId,
              active: true,

              studentEnrollment: {
                studentId,
              },
            },
          },
        },

        select: {
          id: true,
          name: true,
          amount: true,
          concession: true,
          payableAmount: true,
          paidAmount: true,
          dueDate: true,
          status: true,
          sequence: true,
          periodStart: true,
          periodEnd: true,

          studentFeeItem: {
            select: {
              feeCategory: {
                select: {
                  id: true,
                  name: true,
                  code: true,
                },
              },

              studentFee: {
                select: {
                  id: true,

                  studentEnrollment: {
                    select: {
                      id: true,
                    },
                  },

                  feePlan: {
                    select: {
                      id: true,
                      name: true,

                      academicYear: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    /*
     * Sort:
     *
     * 2025-26 Quarter 1
     * 2025-26 Quarter 2
     * 2025-26 Quarter 3
     *
     * then
     *
     * 2026-27 Quarter 1
     * 2026-27 Quarter 2
     * 2026-27 Quarter 3
     */
    installments.sort((a, b) => {
      const aAcademicYear =
        a.studentFeeItem.studentFee.feePlan.academicYear.name;

      const bAcademicYear =
        b.studentFeeItem.studentFee.feePlan.academicYear.name;

      /*
       * Academic year names such as:
       *
       * 2025-26
       * 2026-27
       */
      const aYear =
        Number(aAcademicYear.split("-")[0]) || 0;

      const bYear =
        Number(bAcademicYear.split("-")[0]) || 0;

      if (aYear !== bYear) {
        return aYear - bYear;
      }

      /*
       * Within the same academic year,
       * sort Quarter 1, Quarter 2, Quarter 3.
       */
      if (a.sequence !== b.sequence) {
        return a.sequence - b.sequence;
      }

      /*
       * Final fallback: period start date.
       */
      const aDate = a.periodStart
        ? new Date(a.periodStart).getTime()
        : new Date(a.dueDate).getTime();

      const bDate = b.periodStart
        ? new Date(b.periodStart).getTime()
        : new Date(b.dueDate).getTime();

      return aDate - bDate;
    });

    const rows = installments.map((installment) => {
      const payableAmount =
        Number(installment.payableAmount);

      const paidAmount =
        Number(installment.paidAmount);

      const outstanding =
        Math.max(
          0,
          payableAmount - paidAmount,
        );

      let status:
        | "PAID"
        | "PARTIAL"
        | "PENDING" = "PENDING";

      if (outstanding <= 0) {
        status = "PAID";
      } else if (paidAmount > 0) {
        status = "PARTIAL";
      }

      const academicYear =
        installment.studentFeeItem
          .studentFee
          .feePlan
          .academicYear;

      return {
        id: installment.id,

        installmentName:
          installment.name,

        dueDate:
          installment.dueDate,

        sequence:
          installment.sequence,

        periodStart:
          installment.periodStart,

        periodEnd:
          installment.periodEnd,

        payableAmount,
        paidAmount,
        outstanding,

        status,

        academicYear,

        studentEnrollmentId:
          installment.studentFeeItem
            .studentFee
            .studentEnrollment.id,

        feePlan:
          installment.studentFeeItem
            .studentFee
            .feePlan,

        feeCategory:
          installment.studentFeeItem
            .feeCategory,
      };
    });

    return ApiResponse.success({
      studentEnrollmentId: enrollment.id,
      rows,
    });
  });
}