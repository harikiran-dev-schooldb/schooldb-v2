import { apiHandler } from "@/lib/api";
import { requirePermission } from "@/lib/auth";
import { PERMISSIONS } from "@/lib/access-control";
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
  const result = new Date(date.getFullYear(), date.getMonth(), 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function money(value: unknown) {
  return Number(value ?? 0);
}

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requirePermission(PERMISSIONS.FEE_READ);
    const { searchParams } = new URL(req.url);
    const academicYearId = searchParams.get("academicYearId") || undefined;

    const academicYearPaymentFilter = academicYearId
      ? {
          allocations: {
            some: {
              studentFeeInstallment: {
                studentFeeItem: {
                  studentFee: {
                    feePlan: { academicYearId },
                  },
                },
              },
            },
          },
        }
      : {};

    const installmentWhere = {
      studentFeeItem: {
        studentFee: {
          schoolId: tenant.schoolId,
          active: true,
          ...(academicYearId
            ? { feePlan: { academicYearId } }
            : {}),
        },
      },
    };

    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    const monthStart = startOfMonth(now);

    /*
     * Run all independent dashboard queries concurrently.
     * The ledger uses database aggregates/grouping instead of loading
     * every installment and payment row into the application process.
     */
    const [
      todayPayments,
      monthPayments,
      ledgerTotals,
      statusGroups,
      paymentModeGroups,
      recentPayments,
    ] = await Promise.all([
      prisma.feePayment.aggregate({
        where: {
          schoolId: tenant.schoolId,
          status: "SUCCESS",
          ...academicYearPaymentFilter,
          paymentDate: { gte: todayStart, lte: todayEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.feePayment.aggregate({
        where: {
          schoolId: tenant.schoolId,
          status: "SUCCESS",
          ...academicYearPaymentFilter,
          paymentDate: { gte: monthStart, lte: todayEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.studentFeeInstallment.aggregate({
        where: installmentWhere,
        _sum: {
          amount: true,
          concession: true,
          payableAmount: true,
          paidAmount: true,
        },
        _count: { id: true },
      }),

      prisma.studentFeeInstallment.groupBy({
        by: ["status"],
        where: installmentWhere,
        _count: { id: true },
      }),

      prisma.feePayment.groupBy({
        by: ["paymentMode"],
        where: {
          schoolId: tenant.schoolId,
          status: "SUCCESS",
          ...academicYearPaymentFilter,
          paymentDate: { gte: monthStart, lte: todayEnd },
        },
        _sum: { amount: true },
        _count: { id: true },
      }),

      prisma.feePayment.findMany({
        where: {
          schoolId: tenant.schoolId,
          status: "SUCCESS",
          ...academicYearPaymentFilter,
        },
        orderBy: { paymentDate: "desc" },
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
                select: { admissionNo: true, fullName: true },
              },
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
        },
      }),
    ]);

    const statusCounts = new Map(
      statusGroups.map((group) => [group.status, group._count.id]),
    );

    const paymentModes = Object.fromEntries(
      paymentModeGroups.map((group) => [
        group.paymentMode,
        {
          count: group._count.id,
          amount: money(group._sum.amount),
        },
      ]),
    );

    const totalAmount = money(ledgerTotals._sum.amount);
    const totalConcession = money(ledgerTotals._sum.concession);
    const totalPayable = money(ledgerTotals._sum.payableAmount);
    const totalPaid = money(ledgerTotals._sum.paidAmount);

    return ApiResponse.success({
      summary: {
        totalAmount,
        totalConcession,
        totalPayable,
        totalPaid,
        outstanding: Math.max(0, totalPayable - totalPaid),
        pendingCount: statusCounts.get("PENDING") ?? 0,
        partialCount: statusCounts.get("PARTIAL") ?? 0,
        paidCount: statusCounts.get("PAID") ?? 0,
        waivedCount: statusCounts.get("WAIVED") ?? 0,
        installmentCount: ledgerTotals._count.id,
      },
      collection: {
        today: money(todayPayments._sum.amount),
        todayPaymentCount: todayPayments._count.id,
        thisMonth: money(monthPayments._sum.amount),
        thisMonthPaymentCount: monthPayments._count.id,
      },
      paymentModes,
      recentPayments,
    });
  });
}
