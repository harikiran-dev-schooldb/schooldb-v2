import { prisma } from "@/lib/prisma";

import {
  feeInstallmentRepository,
} from "../repositories/fee-installment.repository";

function addMonths(
  date: Date,
  months: number,
) {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + months,
  );

  return result;
}

function endOfMonth(date: Date) {
  const result = new Date(date);

  result.setMonth(
    result.getMonth() + 1,
    0,
  );

  result.setHours(
    23,
    59,
    59,
    999,
  );

  return result;
}

function createMonthlyInstallments(
  item: {
    id: string;
    amount: unknown;
  },
  startDate: Date,
  endDate: Date,
) {
  const installments = [];

  let current = new Date(startDate);
  let sequence = 1;

  while (current <= endDate) {
    const periodStart = new Date(
      current,
    );

    const periodEnd = new Date(
      Math.min(
        endOfMonth(current).getTime(),
        endDate.getTime(),
      ),
    );

    installments.push({
      feePlanItemId: item.id,

      name: periodStart.toLocaleString(
        "en-IN",
        {
          month: "long",
          year: "numeric",
        },
      ),

      amount: Number(item.amount),

      dueDate: new Date(periodStart),

      sequence,

      periodStart,

      periodEnd,
    });

    current = addMonths(
      current,
      1,
    );

    sequence++;
  }

  return installments;
}

function createQuarterlyInstallments(
  item: {
    id: string;
    amount: unknown;
  },
  startDate: Date,
  endDate: Date,
) {
  const installments = [];

  let current = new Date(startDate);
  let sequence = 1;

  while (current <= endDate) {
    const periodStart = new Date(
      current,
    );

    const calculatedEnd =
      endOfMonth(
        addMonths(current, 2),
      );

    const periodEnd = new Date(
      Math.min(
        calculatedEnd.getTime(),
        endDate.getTime(),
      ),
    );

    installments.push({
      feePlanItemId: item.id,

      name: `Quarter ${sequence}`,

      amount: Number(item.amount),

      dueDate: new Date(periodStart),

      sequence,

      periodStart,

      periodEnd,
    });

    current = addMonths(
      current,
      3,
    );

    sequence++;
  }

  return installments;
}

function createHalfYearlyInstallments(
  item: {
    id: string;
    amount: unknown;
  },
  startDate: Date,
  endDate: Date,
) {
  const installments = [];

  let current = new Date(startDate);
  let sequence = 1;

  while (current <= endDate) {
    const periodStart = new Date(
      current,
    );

    const calculatedEnd =
      endOfMonth(
        addMonths(current, 5),
      );

    const periodEnd = new Date(
      Math.min(
        calculatedEnd.getTime(),
        endDate.getTime(),
      ),
    );

    installments.push({
      feePlanItemId: item.id,

      name: `Half Year ${sequence}`,

      amount: Number(item.amount),

      dueDate: new Date(periodStart),

      sequence,

      periodStart,

      periodEnd,
    });

    current = addMonths(
      current,
      6,
    );

    sequence++;
  }

  return installments;
}

function createAnnualInstallments(
  item: {
    id: string;
    amount: unknown;
  },
  startDate: Date,
  endDate: Date,
) {
  return [
    {
      feePlanItemId: item.id,

      name: "Annual",

      amount: Number(item.amount),

      dueDate: new Date(startDate),

      sequence: 1,

      periodStart: new Date(
        startDate,
      ),

      periodEnd: new Date(
        endDate,
      ),
    },
  ];
}

type GeneratedInstallment = Parameters<
  typeof feeInstallmentRepository.createMany
>[0][number];

export const feeInstallmentService = {
  async generate(schoolId: string, feePlanId: string) {
    const plan = await prisma.feePlan.findFirst({
      where: { id: feePlanId, schoolId },
      select: {
        id: true,
        name: true,
        active: true,
        academicYearId: true,
        academicYear: {
          select: { name: true, startDate: true, endDate: true },
        },
        items: {
          select: {
            id: true,
            frequency: true,
            amount: true,
            installments: { select: { id: true } },
            customInstallments: {
              orderBy: { sequence: "asc" },
              select: {
                name: true,
                amount: true,
                dueDate: true,
                sequence: true,
                periodStart: true,
                periodEnd: true,
              },
            },
          },
        },
      },
    });

    if (!plan) throw new Error("Fee plan not found.");
    if (!plan.active) {
      throw new Error("Cannot generate installments for an inactive fee plan.");
    }

    const needsAcademicPeriods = plan.items.some(
      (item) => item.installments.length === 0 && item.frequency === "TERMLY",
    );
    const academicPeriods = needsAcademicPeriods
      ? await prisma.academicPeriod.findMany({
          where: {
            schoolId,
            academicYearId: plan.academicYearId,
            active: true,
          },
          orderBy: { sequence: "asc" },
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
          },
        })
      : [];

    if (needsAcademicPeriods && academicPeriods.length === 0) {
      throw new Error("No active academic periods found for this academic year.");
    }

    const results: Array<{
      feePlanItemId: string;
      status: "EXISTS" | "GENERATED";
      count: number;
    }> = [];
    const pendingInstallments: GeneratedInstallment[] = [];

    for (const item of plan.items) {
      if (item.installments.length > 0) {
        results.push({
          feePlanItemId: item.id,
          status: "EXISTS",
          count: item.installments.length,
        });
        continue;
      }

      let installments: GeneratedInstallment[];
      switch (item.frequency) {
        case "MONTHLY":
          installments = createMonthlyInstallments(
            item,
            plan.academicYear.startDate,
            plan.academicYear.endDate,
          );
          break;
        case "QUARTERLY":
          installments = createQuarterlyInstallments(
            item,
            plan.academicYear.startDate,
            plan.academicYear.endDate,
          );
          break;
        case "HALF_YEARLY":
          installments = createHalfYearlyInstallments(
            item,
            plan.academicYear.startDate,
            plan.academicYear.endDate,
          );
          break;
        case "ANNUAL":
          installments = createAnnualInstallments(
            item,
            plan.academicYear.startDate,
            plan.academicYear.endDate,
          );
          break;
        case "TERMLY":
          installments = academicPeriods.map((period, index) => ({
            feePlanItemId: item.id,
            academicPeriodId: period.id,
            name: period.name,
            amount: Number(item.amount),
            dueDate: new Date(period.startDate),
            sequence: index + 1,
            periodStart: new Date(period.startDate),
            periodEnd: new Date(period.endDate),
          }));
          break;
        case "CUSTOM":
          if (item.customInstallments.length === 0) {
            throw new Error(
              "No custom installments have been configured for this fee item.",
            );
          }
          installments = item.customInstallments.map((custom) => ({
            feePlanItemId: item.id,
            name: custom.name,
            amount: Number(custom.amount),
            dueDate: new Date(custom.dueDate),
            sequence: custom.sequence,
            periodStart: custom.periodStart
              ? new Date(custom.periodStart)
              : null,
            periodEnd: custom.periodEnd ? new Date(custom.periodEnd) : null,
          }));
          break;
        default:
          throw new Error(`Unsupported fee frequency: ${item.frequency}`);
      }

      pendingInstallments.push(...installments);
      results.push({
        feePlanItemId: item.id,
        status: "GENERATED",
        count: installments.length,
      });
    }

    if (pendingInstallments.length > 0) {
      await feeInstallmentRepository.createMany(pendingInstallments);
    }

    return {
      feePlanId: plan.id,
      feePlanName: plan.name,
      academicYear: plan.academicYear.name,
      results,
    };
  },
};
