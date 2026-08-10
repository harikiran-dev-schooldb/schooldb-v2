import { prisma } from "@/lib/prisma";

export const feeCategoryRepository = {
  list(schoolId: string) {
    return prisma.feeCategory.findMany({
      where: {
        schoolId,
      },

      orderBy: {
        name: "asc",
      },
    });
  },

  findById(
    id: string,
    schoolId: string,
  ) {
    return prisma.feeCategory.findFirst({
      where: {
        id,
        schoolId,
      },
    });
  },

  create(
    schoolId: string,
    data: {
      name: string;
      code?: string;
      description?: string;
      active?: boolean;
    },
  ) {
    return prisma.feeCategory.create({
      data: {
        schoolId,
        name: data.name,
        code: data.code || null,
        description:
          data.description || null,
        active: data.active ?? true,
      },
    });
  },

  update(
    id: string,
    schoolId: string,
    data: {
      name?: string;
      code?: string;
      description?: string;
      active?: boolean;
    },
  ) {
    return prisma.feeCategory.updateMany({
      where: {
        id,
        schoolId,
      },

      data: {
        ...data,
        code:
          data.code !== undefined
            ? data.code || null
            : undefined,
        description:
          data.description !== undefined
            ? data.description || null
            : undefined,
      },
    });
  },
};