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
            section: true,
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
        name: data.name.trim(),
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
    schoolId: string,
    data: {
      name?: string;
      startDate?: Date;
      endDate?: Date;
    },
  ) {
    const exam =
      await prisma.exam.findFirst({
        where: {
          id: examId,
          schoolId,
        },
      });

    if (!exam) {
      return null;
    }

    return prisma.exam.update({
      where: {
        id: exam.id,
      },

      data,
    });
  },

  async delete(
    examId: string,
    schoolId: string,
  ) {
    const exam =
      await prisma.exam.findFirst({
        where: {
          id: examId,
          schoolId,
        },
      });

    if (!exam) {
      return null;
    }

    await prisma.exam.delete({
      where: {
        id: exam.id,
      },
    });

    return exam;
  },
};