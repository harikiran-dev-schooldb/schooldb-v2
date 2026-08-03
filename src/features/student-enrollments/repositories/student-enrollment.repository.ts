import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const studentEnrollmentRepository = {
  list(
    where: Prisma.StudentEnrollmentWhereInput,
    options?: {
      skip?: number;
      take?: number;
    }
  ) {
    return prisma.studentEnrollment.findMany({
      where,

      include: {
        student: true,
        academicYear: true,
        class: true,
        section: true,
      },

      skip: options?.skip,
      take: options?.take,

      orderBy: [
        {
          academicYear: {
            startDate: "desc",
          },
        },
        {
          class: {
            displayOrder: "asc",
          },
        },
        {
          section: {
            displayOrder: "asc",
          },
        },
      ],
    });
  },

  count(where: Prisma.StudentEnrollmentWhereInput) {
    return prisma.studentEnrollment.count({
      where,
    });
  },

  findById(
    id: string,
    schoolId: string
  ) {
    return prisma.studentEnrollment.findFirst({
      where: {
        id,
        schoolId,
      },

      include: {
        student: true,
        academicYear: true,
        class: true,
        section: true,
      },
    });
  },

  create(data: Prisma.StudentEnrollmentCreateInput) {
    return prisma.studentEnrollment.create({
      data,
    });
  },

  update(
    id: string,
    data: Prisma.StudentEnrollmentUpdateInput
  ) {
    return prisma.studentEnrollment.update({
      where: {
        id,
      },
      data,
    });
  },

  findFirst(
    where: Prisma.StudentEnrollmentWhereInput
  ) {
    return prisma.studentEnrollment.findFirst({
      where,
    });
  },
};