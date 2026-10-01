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
    include: {
      branch: { include: { syllabus: true } },
    },
    orderBy: [
      { branch: { syllabus: { displayOrder: "asc" } } },
      { branch: { displayOrder: "asc" } },
      { displayOrder: "asc" },
    ],
  });
},

  findById(id: string, schoolId: string) {
    return prisma.class.findFirst({
      where: {
        id,
        schoolId,
      },
      include: { branch: { include: { syllabus: true } } },
    });
  },

  findByName(name: string, branchId: string, schoolId: string) {
    return prisma.class.findFirst({
      where: {
        schoolId,
        branchId,
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

  options(
  schoolId: string,
  filters?: { syllabusId?: string; branchId?: string },
) {
  return prisma.class.findMany({
    where: {
      schoolId,
      active: true,
      ...(filters?.branchId ? { branchId: filters.branchId } : {}),
      ...(filters?.syllabusId
        ? { branch: { syllabusId: filters.syllabusId } }
        : {}),
    },

    select: {
      id: true,
      name: true,
      branch: {
        select: {
          name: true,
          syllabus: { select: { name: true } },
        },
      },
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
