import { prisma } from "@/lib/prisma";

export const feeInstallmentRepository = {
  findByFeePlanItem(
    feePlanItemId: string,
  ) {
    return prisma.feeInstallment.findMany({
      where: {
        feePlanItemId,
      },
      orderBy: {
        sequence: "asc",
      },
    });
  },

  createMany(
    data: {
      feePlanItemId: string;
      academicPeriodId?: string | null;
      name: string;
      amount: number;
      dueDate: Date;
      sequence: number;
      periodStart?: Date | null;
      periodEnd?: Date | null;
    }[],
  ) {
    return prisma.feeInstallment.createMany({
      data,
    });
  },

  createCustomInstallments(
  feePlanItemId: string,
  installments: {
    name: string;
    amount: number;
    dueDate: Date;
    sequence: number;
    periodStart?: Date | null;
    periodEnd?: Date | null;
  }[],
) {
  return prisma.feePlanCustomInstallment.createMany({
    data: installments.map((item) => ({
      feePlanItemId,
      name: item.name,
      amount: item.amount,
      dueDate: item.dueDate,
      sequence: item.sequence,
      periodStart: item.periodStart ?? null,
      periodEnd: item.periodEnd ?? null,
    })),
  });
},

findCustomInstallments(
  feePlanItemId: string,
) {
  return prisma.feePlanCustomInstallment.findMany({
    where: {
      feePlanItemId,
    },
    orderBy: {
      sequence: "asc",
    },
  });
},
};