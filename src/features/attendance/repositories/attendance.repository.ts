import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const teacherRepository = {
  list(
    where: Prisma.TeacherWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.teacher.findMany({
      where,
      skip: options?.skip,
      take: options?.take,

      orderBy: [
        {
          fullName: "asc",
        },
      ],
    });
  },

  count(where: Prisma.TeacherWhereInput) {
    return prisma.teacher.count({
      where,
    });
  },

  findById(
    id: string,
    schoolId: string
  ) {
    return prisma.teacher.findFirst({
      where: {
        id,
        schoolId,
      },
    });
  },

  findByEmployeeId(
    schoolId: string,
    employeeId: string
  ) {
    return prisma.teacher.findFirst({
      where: {
        schoolId,
        employeeId,
      },
    });
  },

  create(data: Prisma.TeacherCreateInput) {
    return prisma.teacher.create({
      data,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.TeacherUpdateInput
  ) {
    return prisma.teacher.update({
      where: {
        id,
        schoolId,
      },
      data,
    });
  },

  options(schoolId: string) {
    return prisma.teacher.findMany({
      where: {
        schoolId,
        active: true,
      },

      select: {
        id: true,
        employeeId: true,
        fullName: true,
      },

      orderBy: {
        fullName: "asc",
      },
    });
  },
};