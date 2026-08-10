import { prisma } from "@/lib/prisma";
import type { FeePlanInput } from "../schemas/fee-plan.schema";

export const feePlanRepository = {
  list(schoolId: string) {
    return prisma.feePlan.findMany({
      where: {
        schoolId,
      },

      include: {
        academicYear: true,

        classes: {
          include: {
            class: true,
          },
        },

        items: {
          include: {
            feeCategory: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },
    });
  },

  findById(
    id: string,
    schoolId: string,
  ) {
    return prisma.feePlan.findFirst({
      where: {
        id,
        schoolId,
      },

      include: {
        academicYear: true,

        classes: {
          include: {
            class: true,
          },
        },

        items: {
          include: {
            feeCategory: true,
          },
        },
      },
    });
  },

  create(
    schoolId: string,
    input: FeePlanInput,
  ) {
    return prisma.$transaction(
      async (tx) => {
        const plan =
          await tx.feePlan.create({
            data: {
              schoolId,
              academicYearId:
                input.academicYearId,

              name: input.name,

              description:
                input.description || null,

              appliesToAllClasses:
                input.appliesToAllClasses,

              classes:
                input.appliesToAllClasses
                  ? undefined
                  : {
                      create: input.classIds.map(
                        (classId) => ({
                          classId,
                        }),
                      ),
                    },

              items: {
                create: input.items.map(
                  (item) => ({
                    feeCategoryId:
                      item.feeCategoryId,

                    frequency:
                      item.frequency,

                    amount: item.amount,

                    mandatory:
                      item.mandatory ?? true,
                  }),
                ),
              },
            },

            include: {
              academicYear: true,

              classes: {
                include: {
                  class: true,
                },
              },

              items: {
                include: {
                  feeCategory: true,
                },
              },
            },
          });

        return plan;
      },
    );
  },
};