import { Prisma } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

const homeworkInclude = {
  academicYear: true,
  teacher: true,
  subject: true,
  class: true,
  section: true,
} satisfies Prisma.HomeworkInclude;

export const homeworkRepository = {
  list(
    where: Prisma.HomeworkWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.homework.findMany({
      where,

      include: homeworkInclude,

      skip: options?.skip,
      take: options?.take,

      orderBy: [
        {
          dueDate: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });
  },

  count(
    where: Prisma.HomeworkWhereInput
  ) {
    return prisma.homework.count({
      where,
    });
  },

  get(
    id: string,
    schoolId: string
  ) {
    return prisma.homework.findFirst({
      where: {
        id,
        schoolId,
      },

      include: homeworkInclude,
    });
  },

  create(
    data: Prisma.HomeworkCreateInput
  ) {
    return prisma.homework.create({
      data,

      include: homeworkInclude,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.HomeworkUpdateInput
  ) {
    return prisma.homework.update({
      where: {
        id,
        schoolId,
      },

      data,

      include: homeworkInclude,
    });
  },

  delete(
    id: string,
    schoolId: string
  ) {
    return prisma.homework.delete({
      where: {
        id,
        schoolId,
      },
    });
  },

  options(
    schoolId: string
  ) {
    return prisma.homework.findMany({
      where: {
        schoolId,
        active: true,
      },

      select: {
        id: true,
        title: true,
        dueDate: true,
      },

      orderBy: {
        dueDate: "desc",
      },
    });
  },
};