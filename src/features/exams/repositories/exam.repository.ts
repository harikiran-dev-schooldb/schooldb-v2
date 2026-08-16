import { prisma } from "@/lib/prisma";

export const examRepository = {
  async findAllBySchool(
    schoolId: string,
  ) {
    return prisma.exam.findMany({
      where: {
        schoolId,
      },

      include: {
        academicYear: true,

        _count: {
          select: {
            schedules: true,
          },
        },
      },

      orderBy: {
        startDate: "asc",
      },
    });
  },

  async findById(
    examId: string,
    schoolId: string,
  ) {
    return prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId,
      },

      include: {
        academicYear: true,

        schedules: {
          include: {
            subject: true,
            class: true,
          },

          orderBy: {
            examDate: "asc",
          },
        },
      },
    });
  },

  async create(
    schoolId: string,
    data: {
      academicYearId: string;
      name: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    return prisma.exam.create({
      data: {
        schoolId,
        academicYearId: data.academicYearId,
        name: data.name,
        startDate: data.startDate,
        endDate: data.endDate,
      },

      include: {
        academicYear: true,
      },
    });
  },

  async update(
    examId: string,
    data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    return prisma.exam.update({
      where: {
        id: examId,
      },

      data,
    });
  },

  async delete(examId: string) {
    return prisma.exam.delete({
      where: {
        id: examId,
      },
    });
  },
};