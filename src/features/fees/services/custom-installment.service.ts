import { prisma } from "@/lib/prisma";

import {
  feeInstallmentRepository,
} from "../repositories/fee-installment.repository";

import type {
  CustomInstallmentsInput,
} from "../schemas/custom-installment.schema";

function parseDate(
  value: string,
) {
  const date = new Date(
    `${value}T00:00:00.000Z`,
  );

  if (Number.isNaN(date.getTime())) {
    throw new Error(
      `Invalid date: ${value}`,
    );
  }

  return date;
}

export const customInstallmentService = {
  async create(
    schoolId: string,
    feePlanItemId: string,
    input: CustomInstallmentsInput,
  ) {
    const item =
      await prisma.feePlanItem.findFirst({
        where: {
          id: feePlanItemId,

          feePlan: {
            schoolId,
          },
        },

        include: {
          feePlan: {
            include: {
              academicYear: true,
            },
          },
        },
      });

    if (!item) {
      throw new Error(
        "Fee plan item not found.",
      );
    }

    if (
      item.frequency !== "CUSTOM"
    ) {
      throw new Error(
        "Custom installments can only be configured for CUSTOM fee frequency.",
      );
    }

    const existing =
      await feeInstallmentRepository.findCustomInstallments(
        feePlanItemId,
      );

    if (existing.length > 0) {
      throw new Error(
        "Custom installments are already configured for this fee item.",
      );
    }

    const academicYear =
      item.feePlan.academicYear;

    const sorted = [
      ...input.installments,
    ].sort(
      (a, b) =>
        a.sequence - b.sequence,
    );

    const sequences =
      new Set<number>();

    for (const installment of sorted) {
      if (
        sequences.has(
          installment.sequence,
        )
      ) {
        throw new Error(
          `Duplicate sequence: ${installment.sequence}`,
        );
      }

      sequences.add(
        installment.sequence,
      );

      const dueDate = parseDate(
        installment.dueDate,
      );

      if (
        dueDate <
          academicYear.startDate ||
        dueDate >
          academicYear.endDate
      ) {
        throw new Error(
          `Due date for "${installment.name}" must be within the academic year.`,
        );
      }

      if (
        installment.periodStart &&
        installment.periodEnd
      ) {
        const periodStart =
          parseDate(
            installment.periodStart,
          );

        const periodEnd =
          parseDate(
            installment.periodEnd,
          );

        if (
          periodEnd < periodStart
        ) {
          throw new Error(
            `Period end cannot be before period start for "${installment.name}".`,
          );
        }

        if (
          periodStart <
            academicYear.startDate ||
          periodEnd >
            academicYear.endDate
        ) {
          throw new Error(
            `Period for "${installment.name}" must be within the academic year.`,
          );
        }
      }
    }

    const created =
      await prisma.$transaction(
        async (tx) => {
          const result =
            await tx.feePlanCustomInstallment.createMany(
              {
                data: sorted.map(
                  (installment) => ({
                    feePlanItemId,

                    name: installment.name,

                    amount:
                      installment.amount,

                    dueDate:
                      parseDate(
                        installment.dueDate,
                      ),

                    sequence:
                      installment.sequence,

                    periodStart:
                      installment.periodStart
                        ? parseDate(
                            installment.periodStart,
                          )
                        : null,

                    periodEnd:
                      installment.periodEnd
                        ? parseDate(
                            installment.periodEnd,
                          )
                        : null,
                  }),
                ),
              },
            );

          return result;
        },
      );

    return {
      feePlanItemId,
      count: created.count,
    };
  },

  async list(
    schoolId: string,
    feePlanItemId: string,
  ) {
    const item =
      await prisma.feePlanItem.findFirst({
        where: {
          id: feePlanItemId,

          feePlan: {
            schoolId,
          },
        },
      });

    if (!item) {
      throw new Error(
        "Fee plan item not found.",
      );
    }

    return feeInstallmentRepository.findCustomInstallments(
      feePlanItemId,
    );
  },
};