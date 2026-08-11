import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{
    id: string;
  }>;
};

export async function GET(
  _req: Request,
  { params }: Params,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { id } = await params;

    const payment =
      await prisma.feePayment.findFirst({
        where: {
          id,
          schoolId: tenant.schoolId,
        },

        include: {
          school: true,

          studentEnrollment: {
            include: {
              student: true,
              class: true,
              section: true,
              academicYear: true,
            },
          },

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
        },
      });

    if (!payment) {
      return ApiResponse.error(
        "Payment not found.",
        404,
      );
    }

    return ApiResponse.success({
      id: payment.id,
      receiptNo: payment.receiptNo,

      paymentDate:
        payment.paymentDate,

      amount: Number(payment.amount),

      paymentMode:
        payment.paymentMode,

      referenceNo:
        payment.referenceNo,

      remarks:
        payment.remarks,

      status:
        payment.status,

      school: {
        id: payment.school.id,
        name: payment.school.name,
      },

      student: {
        id:
          payment.studentEnrollment
            .student.id,

        fullName:
          payment.studentEnrollment
            .student.fullName,

        admissionNo:
          payment.studentEnrollment
            .student.admissionNo,

        class:
          payment.studentEnrollment
            .class.name,

        section:
          payment.studentEnrollment
            .section.name,

        academicYear:
          payment.studentEnrollment
            .academicYear.name,
      },

      allocations:
        payment.allocations.map(
          (allocation) => ({
            installmentId:
              allocation
                .studentFeeInstallment.id,

            installmentName:
              allocation
                .studentFeeInstallment
                .name,

            feeCategory:
              allocation
                .studentFeeInstallment
                .studentFeeItem
                .feeCategory.name,

            amount:
              Number(
                allocation.amount,
              ),
          }),
        ),
    });
  });
}