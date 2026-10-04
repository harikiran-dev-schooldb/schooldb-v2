import type { Prisma } from "@/generated/prisma/client";

type TransactionClient = Prisma.TransactionClient;

export async function syncStudentRteWaivers(
  tx: TransactionClient,
  schoolId: string,
  studentId: string,
  isRte: boolean,
) {
  const installments = await tx.studentFeeInstallment.findMany({
    where: {
      paidAmount: 0,
      ...(isRte ? {} : { rteWaiver: { gt: 0 } }),
      studentFeeItem: {
        studentFee: {
          schoolId,
          active: true,
          studentEnrollment: { studentId },
        },
      },
    },
    select: {
      id: true,
      studentFeeItemId: true,
      amount: true,
      concession: true,
    },
  });

  for (const installment of installments) {
    const amount = Number(installment.amount);
    const concession = Number(installment.concession);
    const rteWaiver = isRte ? Math.max(amount - concession, 0) : 0;
    const payableAmount = Math.max(amount - concession - rteWaiver, 0);

    await tx.studentFeeInstallment.update({
      where: { id: installment.id },
      data: {
        rteWaiver,
        payableAmount,
        status: payableAmount === 0 ? "WAIVED" : "PENDING",
      },
    });
  }

  const itemIds = [...new Set(installments.map((item) => item.studentFeeItemId))];

  for (const itemId of itemIds) {
    const totals = await tx.studentFeeInstallment.aggregate({
      where: { studentFeeItemId: itemId },
      _sum: {
        concession: true,
        rteWaiver: true,
        payableAmount: true,
      },
    });

    await tx.studentFeeItem.update({
      where: { id: itemId },
      data: {
        concession: totals._sum.concession ?? 0,
        rteWaiver: totals._sum.rteWaiver ?? 0,
        finalAmount: totals._sum.payableAmount ?? 0,
      },
    });
  }

  return installments.length;
}
