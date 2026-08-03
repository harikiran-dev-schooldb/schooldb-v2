import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const sectionRepository = {
  list(
    where: Prisma.SectionWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.section.findMany({
      where,
      include: {
        class: true,
      },
      skip: options?.skip,
      take: options?.take,
      orderBy: [
        {
          class: {
            displayOrder: "asc",
          },
        },
        {
          displayOrder: "asc",
        },
      ],
    });
  },

  count(where: Prisma.SectionWhereInput) {
    return prisma.section.count({
      where,
    });
  },

  findById(id: string, schoolId: string) {
    return prisma.section.findFirst({
      where: {
        id,
        class: {
          schoolId,
        },
      },
      include: {
        class: true,
      },
    });
  },

  findByName(
    schoolId: string,
    classId: string,
    name: string
  ) {
    return prisma.section.findFirst({
      where: {
        classId,
        name,
        class: {
          schoolId,
        },
      },
    });
  },

  create(data: Prisma.SectionCreateInput) {
    return prisma.section.create({
      data,
    });
  },

  update(
    id: string,
    data: Prisma.SectionUpdateInput
  ) {
    return prisma.section.update({
      where: {
        id,
      },
      data,
    });
  },
};