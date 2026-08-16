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

    const payments =
      await prisma.feePayment.findMany({
        where: {
          schoolId: tenant.schoolId,

          status: "VOID",

          ...(search
            ? {
                OR: [
                  {
                    receiptNo: {
                      contains: search,
                      mode: "insensitive",
                    },
                  },

                  {
                    studentEnrollment: {
                      student: {
                        fullName: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    },
                  },

                  {
                    studentEnrollment: {
                      student: {
                        admissionNo: {
                          contains: search,
                          mode: "insensitive",
                        },
                      },
                    },
                  },
                ],
              }
            : {}),
        },

        orderBy: {
          voidedAt: "desc",
        },

        include: {
          studentEnrollment: {
            include: {
              student: true,
              class: true,
              section: true,
            },
          },

          allocations: true,
        },
      });

    const rows = payments.map((payment) => ({
      id: payment.id,

      receiptNo: payment.receiptNo,

      paymentDate: payment.paymentDate,

      voidedAt: payment.voidedAt,

      voidReason: payment.voidReason,

      amount: Number(payment.amount),

      paymentMode: payment.paymentMode,

      referenceNo: payment.referenceNo,

      student: {
        id: payment.studentEnrollment.student.id,

        fullName:
          payment.studentEnrollment.student.fullName,

        admissionNo:
          payment.studentEnrollment.student.admissionNo,

        class:
          payment.studentEnrollment.class.name,

        section:
          payment.studentEnrollment.section.name,
      },

      allocationCount:
        payment.allocations.length,
    }));

    const totalVoidedAmount =
      rows.reduce(
        (sum, payment) => sum + payment.amount,
        0,
      );

    return ApiResponse.success({
      rows,

      summary: {
        paymentCount: rows.length,
        totalVoidedAmount,
      },
    });
  });
}