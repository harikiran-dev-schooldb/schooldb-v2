import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function endOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result;
}

function startOfMonth(date: Date) {
  const result = new Date(
    date.getFullYear(),
    date.getMonth(),
    1,
  );

  result.setHours(0, 0, 0, 0);

  return result;
}

function money(value: unknown) {
  return Number(value ?? 0);
}

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const now = new Date();

    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const monthStart = startOfMonth(now);

    /*
     * ==========================
     * Payment Collection
     * ==========================
     */

    const todayPayments =
      await prisma.feePayment.aggregate({
        where: {
          schoolId: tenant.schoolId,

          status: "SUCCESS",

          paymentDate: {
            gte: todayStart,
            lte: todayEnd,
          },
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    const monthPayments =
      await prisma.feePayment.aggregate({
        where: {
          schoolId: tenant.schoolId,

          status: "SUCCESS",

          paymentDate: {
            gte: monthStart,
            lte: todayEnd,
          },
        },

        _sum: {
          amount: true,
        },

        _count: {
          id: true,
        },
      });

    /*
     * ==========================
     * Fee Ledger
     * ==========================
     */

    const installments =
      await prisma.studentFeeInstallment.findMany({
        where: {
          studentFeeItem: {
            studentFee: {
              schoolId: tenant.schoolId,
              active: true,
            },
          },
        },

        select: {
          amount: true,
          concession: true,
          payableAmount: true,
          paidAmount: true,
          status: true,
        },
      });

    let totalAmount = 0;
    let totalConcession = 0;
    let totalPayable = 0;
    let totalPaid = 0;

    let pendingCount = 0;
    let partialCount = 0;
    let paidCount = 0;
    let waivedCount = 0;

    for (const installment of installments) {
      totalAmount += money(
        installment.amount,
      );

      totalConcession += money(
        installment.concession,
      );

      totalPayable += money(
        installment.payableAmount,
      );

      totalPaid += money(
        installment.paidAmount,
      );

      switch (installment.status) {
        case "PENDING":
          pendingCount++;
          break;

        case "PARTIAL":
          partialCount++;
          break;

        case "PAID":
          paidCount++;
          break;

        case "WAIVED":
          waivedCount++;
          break;
      }
    }

    /*
     * ==========================
     * Payment Modes
     * ==========================
     */

    const payments =
      await prisma.feePayment.findMany({
        where: {
          schoolId: tenant.schoolId,

          status: "SUCCESS",

          paymentDate: {
            gte: monthStart,
            lte: todayEnd,
          },
        },

        select: {
          amount: true,
          paymentMode: true,
        },
      });

    const paymentModes: Record<
      string,
      {
        count: number;
        amount: number;
      }
    > = {};

    for (const payment of payments) {
      const mode = payment.paymentMode;

      if (!paymentModes[mode]) {
        paymentModes[mode] = {
          count: 0,
          amount: 0,
        };
      }

      paymentModes[mode].count += 1;

      paymentModes[mode].amount += money(
        payment.amount,
      );
    }

    /*
     * ==========================
     * Recent Payments
     * ==========================
     */

    const recentPayments =
      await prisma.feePayment.findMany({
        where: {
          schoolId: tenant.schoolId,
          status: "SUCCESS",
        },

        orderBy: {
          paymentDate: "desc",
        },

        take: 10,

        select: {
          id: true,
          receiptNo: true,
          paymentDate: true,
          amount: true,
          paymentMode: true,

          studentEnrollment: {
            select: {
              student: {
                select: {
                  admissionNo: true,
                  fullName: true,
                },
              },

              class: {
                select: {
                  name: true,
                },
              },

              section: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

    return ApiResponse.success({
      summary: {
        totalAmount,
        totalConcession,
        totalPayable,
        totalPaid,

        outstanding:
          Math.max(
            0,
            totalPayable - totalPaid,
          ),

        pendingCount,
        partialCount,
        paidCount,
        waivedCount,

        installmentCount:
          installments.length,
      },

      collection: {
        today: money(
          todayPayments._sum.amount,
        ),

        todayPaymentCount:
          todayPayments._count.id,

        thisMonth: money(
          monthPayments._sum.amount,
        ),

        thisMonthPaymentCount:
          monthPayments._count.id,
      },

      paymentModes,

      recentPayments,
    });
  });
}