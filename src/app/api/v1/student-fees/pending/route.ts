import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { searchParams } = new URL(req.url);

    const search =
      searchParams.get("search")?.trim() || undefined;

    const classId =
      searchParams.get("classId") || undefined;

    const academicYearId =
      searchParams.get("academicYearId") || undefined;

    const installments =
      await prisma.studentFeeInstallment.findMany({
        where: {
          status: {
            in: ["PENDING", "PARTIAL"],
          },

          studentFeeItem: {
            studentFee: {
              schoolId: tenant.schoolId,
              active: true,

              ...(academicYearId
                ? {
                    feePlan: {
                      academicYearId,
                    },
                  }
                : {}),

              studentEnrollment: {
                ...(classId
                  ? {
                      classId,
                    }
                  : {}),

                ...(search
                  ? {
                      student: {
                        OR: [
                          {
                            fullName: {
                              contains: search,
                              mode: "insensitive",
                            },
                          },
                          {
                            admissionNo: {
                              contains: search,
                              mode: "insensitive",
                            },
                          },
                        ],
                      },
                    }
                  : {}),
              },
            },
          },
        },

        orderBy: {
          dueDate: "asc",
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
                      rollNo: true,

                      student: {
                        select: {
                          id: true,
                          admissionNo: true,
                          fullName: true,
                        },
                      },

                      class: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },

                      section: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
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

    const rows = installments.map((installment) => {
      const amount =
        Number(installment.amount);

      const concession =
        Number(installment.concession);

      const payableAmount =
        Number(installment.payableAmount);

      const paidAmount =
        Number(installment.paidAmount);

      const outstanding =
        Math.max(
          0,
          payableAmount - paidAmount,
        );

      const enrollment =
        installment.studentFeeItem
          .studentFee.studentEnrollment;

      return {
        id: installment.id,

        installmentName:
          installment.name,

        dueDate:
          installment.dueDate,

        status:
          installment.status,

        amount,
        concession,
        payableAmount,
        paidAmount,
        outstanding,

        feeCategory:
          installment.studentFeeItem
            .feeCategory,

        student: {
          id:
            enrollment.student.id,

          admissionNo:
            enrollment.student.admissionNo,

          fullName:
            enrollment.student.fullName,
        },

        class:
          enrollment.class,

        section:
          enrollment.section,

        rollNo:
          enrollment.rollNo,

        studentFeeId:
          installment.studentFeeItem
            .studentFee.id,

        // Required by RecordFeePaymentDialog
        studentEnrollmentId:
          enrollment.id,

        feePlan:
          installment.studentFeeItem
            .studentFee.feePlan,
      };
    });

    const total =
      rows.reduce(
        (sum, row) =>
          sum + row.outstanding,
        0,
      );

    const totalPayable =
      rows.reduce(
        (sum, row) =>
          sum + row.payableAmount,
        0,
      );

    const totalPaid =
      rows.reduce(
        (sum, row) =>
          sum + row.paidAmount,
        0,
      );

    const totalConcession =
      rows.reduce(
        (sum, row) =>
          sum + row.concession,
        0,
      );

    return ApiResponse.success({
      rows,

      summary: {
        installmentCount:
          rows.length,

        totalPayable,

        totalConcession,

        totalPaid,

        outstanding:
          total,
      },
    });
  });
}