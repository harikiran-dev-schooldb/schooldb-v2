import { prisma } from "@/lib/prisma";

export const examService = {
  /*
   * Get all exams for a school.
   */
  async getAll(schoolId: string) {
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

      orderBy: [
        {
          academicYear: {
            startDate: "desc",
          },
        },
        {
          startDate: "asc",
        },
      ],
    });
  },

  /*
   * Get a single exam.
   */
  async getById(
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

  /*
   * Create a new exam.
   */
  async create(
    schoolId: string,
    data: {
      academicYearId: string;
      name: string;
      startDate: Date;
      endDate: Date;
    },
  ) {
    /*
     * Verify that the academic year
     * belongs to this school.
     */
    const academicYear =
      await prisma.academicYear.findFirst({
        where: {
          id: data.academicYearId,
          schoolId,
        },
      });

    if (!academicYear) {
      throw new Error("Academic year not found.");
    }

    return prisma.exam.create({
      data: {
        schoolId,

        academicYearId:
          data.academicYearId,

        name: data.name.trim(),

        startDate:
          data.startDate,

        endDate:
          data.endDate,
      },

      include: {
        academicYear: true,
      },
    });
  },

  /*
   * Update an existing exam.
   */
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

      data: {
        ...(data.name !== undefined && {
          name: data.name.trim(),
        }),

        ...(data.startDate !== undefined && {
          startDate:
            data.startDate,
        }),

        ...(data.endDate !== undefined && {
          endDate:
            data.endDate,
        }),
      },

      include: {
        academicYear: true,
      },
    });
  },

  /*
   * Delete an exam.
   */
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