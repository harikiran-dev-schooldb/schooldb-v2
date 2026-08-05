import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const academicYearRepository = {
  list(
    where: Prisma.AcademicYearWhereInput,
    options?: {
      skip?: number;
      take?: number;
      orderBy?: Prisma.AcademicYearOrderByWithRelationInput;
    }
  ) {
    return prisma.academicYear.findMany({
      where,

      skip: options?.skip,
      take: options?.take,

      orderBy:
        options?.orderBy ?? {
          startDate: "desc",
        },
    });
  },

  count(where: Prisma.AcademicYearWhereInput) {
    return prisma.academicYear.count({
      where,
    });
  },

  options(schoolId: string) {
    return prisma.academicYear.findMany({
      where: {
        schoolId,
      },

      select: {
        id: true,
        name: true,
      },

      orderBy: {
        startDate: "desc",
      },
    });
  },

  findById(
    id: string,
    schoolId: string
  ) {
    return prisma.academicYear.findFirst({
      where: {
        id,
        schoolId,
      },
    });
  },

  findByName(
    schoolId: string,
    name: string
  ) {
    return prisma.academicYear.findFirst({
      where: {
        schoolId,
        name,
      },
    });
  },

  create(data: Prisma.AcademicYearCreateInput) {
    return prisma.academicYear.create({
      data,
    });
  },

  update(
    id: string,
    data: Prisma.AcademicYearUpdateInput
  ) {
    return prisma.academicYear.update({
      where: {
        id,
      },
      data,
    });
  },

  deactivateAll(schoolId: string) {
    return prisma.academicYear.updateMany({
      where: {
        schoolId,
        active: true,
      },

      data: {
        active: false,
      },
    });
  },

  activate(id: string, schoolId: string) {
    return prisma.$transaction(async (tx) => {
      await tx.academicYear.updateMany({
        where: {
          schoolId,
          active: true,
        },
        data: {
          active: false,
        },
      });

      return tx.academicYear.update({
        where: { id },
        data: { active: true },
      });
    });
  },

  delete(id: string) {
    return prisma.academicYear.delete({
      where: {
        id,
      },
    });
  },
};
