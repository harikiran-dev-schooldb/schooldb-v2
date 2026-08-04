import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const subjectRepository = {
  list(
    where: Prisma.SubjectWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.subject.findMany({
      where,
      skip: options?.skip,
      take: options?.take,

      orderBy: [
        {
          displayOrder: "asc",
        },
        {
          name: "asc",
        },
      ],
    });
  },

  count(where: Prisma.SubjectWhereInput) {
    return prisma.subject.count({
      where,
    });
  },

  findById(
    id: string,
    schoolId: string
  ) {
    return prisma.subject.findFirst({
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
    return prisma.subject.findFirst({
      where: {
        schoolId,
        name,
      },
    });
  },

  create(data: Prisma.SubjectCreateInput) {
    return prisma.subject.create({
      data,
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.SubjectUpdateInput
  ) {
    return prisma.subject.update({
      where: {
        id,
        schoolId,
      },

      data,
    });
  },

  options(schoolId: string) {
    return prisma.subject.findMany({
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
          name: "asc",
        },
      ],
    });
  },
};