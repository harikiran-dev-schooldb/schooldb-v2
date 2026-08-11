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

    _count: {
      select: {
        installments: true,
      },
    },
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
    _count: {
      select: {
        installments: true,
      },
    },
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

  async update(
  id: string,
  schoolId: string,
  input: FeePlanInput,
) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.feePlan.findFirst({
      where: {
        id,
        schoolId,
      },
      include: {
        items: {
          include: {
            _count: {
              select: {
                installments: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      throw new Error("Fee plan not found.");
    }

    const hasInstallments = existing.items.some(
      (item) => item._count.installments > 0,
    );

    // Always update the plan itself and classes.
    await tx.feePlanClass.deleteMany({
      where: {
        feePlanId: id,
      },
    });

    // If installments already exist, DO NOT touch FeePlanItems.
    if (hasInstallments) {
      return tx.feePlan.update({
        where: {
          id,
        },

        data: {
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
    }

    // No installments yet → full structure can be replaced.
    await tx.feePlanItem.deleteMany({
      where: {
        feePlanId: id,
      },
    });

    return tx.feePlan.update({
      where: {
        id,
      },

      data: {
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
  });
},
};