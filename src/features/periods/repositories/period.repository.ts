import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const periodRepository = {
  list(
    where: Prisma.PeriodWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.period.findMany({
      where,

      skip: options?.skip,
      take: options?.take,

      orderBy: [
        {
          displayOrder: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });
  },

  count(where: Prisma.PeriodWhereInput) {
    return prisma.period.count({
      where,
    });
  },

  get(id: string, schoolId: string) {
    return prisma.period.findFirst({
      where: {
        id,
        schoolId,
      },
    });
  },

  findByName(
    schoolId: string,
    name: string,
    excludeId?: string
  ) {
    return prisma.period.findFirst({
      where: {
        schoolId,
        name,

        ...(excludeId && {
          NOT: {
            id: excludeId,
          },
        }),
      },
    });
  },

  findByDisplayOrder(
    schoolId: string,
    displayOrder: number,
    excludeId?: string
  ) {
    return prisma.period.findFirst({
      where: {
        schoolId,
        displayOrder,

        ...(excludeId && {
          NOT: {
            id: excludeId,
          },
        }),
      },
    });
  },

  findOverlapping(
    schoolId: string,
    startTime: string,
    endTime: string,
    excludeId?: string
  ) {
    return prisma.period.findMany({
      where: {
        schoolId,

        ...(excludeId && {
          NOT: {
            id: excludeId,
          },
        }),

        AND: [
          {
            startTime: {
              lt: endTime,
            },
          },
          {
            endTime: {
              gt: startTime,
            },
          },
        ],
      },
    });
  },

  create(data: Prisma.PeriodCreateInput) {
    return prisma.period.create({
      data,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.PeriodUpdateInput
  ) {
    return prisma.period.update({
      where: {
        id,
        schoolId,
      },
      data,
    });
  },

  options(schoolId: string) {
    return prisma.period.findMany({
      where: {
        schoolId,
        active: true,
      },

      select: {
        id: true,
        name: true,
      },

      orderBy: [
        {
          displayOrder: "asc",
        },
        {
          startTime: "asc",
        },
      ],
    });
  },
};