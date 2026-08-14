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

    orderBy: [
      {
        sequence: "asc",
      },
      {
        dueDate: "asc",
      },
    ],

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
  const payableAmount = Number(installment.payableAmount);

  const paidAmount = Number(installment.paidAmount);

  const outstanding = Math.max(0, payableAmount - paidAmount);

  let status: "PAID" | "PARTIAL" | "PENDING" = "PENDING";

  if (outstanding <= 0) {
    status = "PAID";
  } else if (paidAmount > 0) {
    status = "PARTIAL";
  }

  return {
    id: installment.id,

    installmentName: installment.name,

    dueDate: installment.dueDate,

    payableAmount,
    paidAmount,
    outstanding,

    status,

    studentEnrollmentId:
      installment.studentFeeItem.studentFee.studentEnrollment.id,

    feePlan:
      installment.studentFeeItem.studentFee.feePlan,

    feeCategory:
      installment.studentFeeItem.feeCategory,
  };
});

    return ApiResponse.success({
      studentEnrollmentId: enrollment.id,
      rows,
    });
  });
}