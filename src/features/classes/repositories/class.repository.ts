import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const classRepository = {
  list(
  where: Prisma.ClassWhereInput,
  options?: {
    skip?: number;
    take?: number;
  }
) {
  return prisma.class.findMany({
    where,
    skip: options?.skip,
    take: options?.take,
    orderBy: {
      displayOrder: "asc",
    },
  });
},

  findById(id: string, schoolId: string) {
    return prisma.class.findFirst({
      where: {
        id,
        schoolId,
      },
    });
  },

  findByName(name: string, schoolId: string) {
    return prisma.class.findFirst({
      where: {
        schoolId,
        name,
      },
    });
  },

  create(data: Prisma.ClassCreateInput) {
    return prisma.class.create({
      data,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.ClassUpdateInput
  ) {
    return prisma.class.update({
      where: {
        id,
        schoolId,
      },
      data,
    });
  },

  options(schoolId: string) {
  return prisma.class.findMany({
    where: {
      schoolId,
      active: true,
    },

    select: {
      id: true,
      name: true,
    },

    orderBy: {
      displayOrder: "asc",
    },
  });
},

  count(where: Prisma.ClassWhereInput) {
    return prisma.class.count({
      where,
    });
  },
};