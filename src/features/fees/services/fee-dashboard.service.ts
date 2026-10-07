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

function startOfPreviousMonth(date: Date) {
  const result = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  result.setHours(0, 0, 0, 0);
  return result;
}

function money(value: unknown) {
  return Number(value ?? 0);
}

export async function getFeeDashboard(
  schoolId: string,
  academicYearId?: string,
) {
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
        schoolId,
        active: true,
        studentEnrollment: {
          active: true,
          student: { status: "ACTIVE" as const },
        },
        ...(academicYearId ? { feePlan: { academicYearId } } : {}),
      },
    },
  };

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const previousMonthStart = startOfPreviousMonth(now);
  const previousMonthEnd = new Date(monthStart.getTime() - 1);

  const [
    todayPayments,
    monthPayments,
    ledgerTotals,
    statusGroups,
    paymentModeGroups,
    recentPayments,
    previousMonthPayments,
    monthExpenses,
    ageingInstallments,
  ] = await Promise.all([
    prisma.feePayment.aggregate({
      where: {
        schoolId,
        status: "SUCCESS",
        ...academicYearPaymentFilter,
        paymentDate: { gte: todayStart, lte: todayEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.feePayment.aggregate({
      where: {
        schoolId,
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
        rteWaiver: true,
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
        schoolId,
        status: "SUCCESS",
        ...academicYearPaymentFilter,
        paymentDate: { gte: monthStart, lte: todayEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.feePayment.findMany({
      where: {
        schoolId,
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
            student: { select: { admissionNo: true, fullName: true } },
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    }),
    prisma.feePayment.aggregate({
      where: {
        schoolId,
        status: "SUCCESS",
        ...academicYearPaymentFilter,
        paymentDate: { gte: previousMonthStart, lte: previousMonthEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.expense.aggregate({
      where: {
        schoolId,
        status: "POSTED",
        expenseDate: { gte: monthStart, lte: todayEnd },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    prisma.studentFeeInstallment.findMany({
      where: {
        ...installmentWhere,
        status: { in: ["PENDING", "PARTIAL"] },
        dueDate: { lt: todayStart },
      },
      select: { dueDate: true, payableAmount: true, paidAmount: true },
    }),
  ]);

  const statusCounts = new Map(
    statusGroups.map((group) => [group.status, group._count.id]),
  );
  const paymentModes = Object.fromEntries(
    paymentModeGroups.map((group) => [
      group.paymentMode,
      { count: group._count.id, amount: money(group._sum.amount) },
    ]),
  );
  const totalAmount = money(ledgerTotals._sum.amount);
  const totalRteWaiver = money(ledgerTotals._sum.rteWaiver);
  const totalConcession = money(ledgerTotals._sum.concession);
  const totalPayable = money(ledgerTotals._sum.payableAmount);
  const totalPaid = money(ledgerTotals._sum.paidAmount);
  const ageing = {
    current: { count: 0, amount: 0 },
    days31To60: { count: 0, amount: 0 },
    days61To90: { count: 0, amount: 0 },
    over90: { count: 0, amount: 0 },
  };
  for (const installment of ageingInstallments) {
    const overdueDays = Math.max(
      0,
      Math.floor((todayStart.getTime() - installment.dueDate.getTime()) / 86_400_000),
    );
    const balance = Math.max(
      0,
      money(installment.payableAmount) - money(installment.paidAmount),
    );
    const bucket = overdueDays > 90
      ? ageing.over90
      : overdueDays > 60
        ? ageing.days61To90
        : overdueDays > 30
          ? ageing.days31To60
          : ageing.current;
    bucket.count += 1;
    bucket.amount += balance;
  }

  return {
    summary: {
      totalAmount,
      totalRteWaiver,
      totalConcession,
      totalPayable,
      totalPaid,
      outstanding: Math.max(0, totalPayable - totalPaid),
      pendingCount: statusCounts.get("PENDING") ?? 0,
      partialCount: statusCounts.get("PARTIAL") ?? 0,
      paidCount: statusCounts.get("PAID") ?? 0,
      waivedCount: statusCounts.get("WAIVED") ?? 0,
      installmentCount: ledgerTotals._count.id,
      collectionEfficiency: totalPayable > 0
        ? Math.round((totalPaid / totalPayable) * 1000) / 10
        : 0,
    },
    collection: {
      today: money(todayPayments._sum.amount),
      todayPaymentCount: todayPayments._count.id,
      thisMonth: money(monthPayments._sum.amount),
      thisMonthPaymentCount: monthPayments._count.id,
      previousMonth: money(previousMonthPayments._sum.amount),
      previousMonthPaymentCount: previousMonthPayments._count.id,
      thisMonthExpenses: money(monthExpenses._sum.amount),
      thisMonthExpenseCount: monthExpenses._count.id,
      netCashFlow: money(monthPayments._sum.amount) - money(monthExpenses._sum.amount),
    },
    ageing,
    paymentModes,
    recentPayments,
  };
}
