import { prisma } from "@/lib/prisma";

function validateExamDates(
  startDate: Date | null | undefined,
  endDate: Date | null | undefined,
) {
  if (startDate && Number.isNaN(startDate.getTime())) {
    throw new Error("Invalid exam start date.");
  }

  if (endDate && Number.isNaN(endDate.getTime())) {
    throw new Error("Invalid exam end date.");
  }

  if (startDate && endDate && endDate < startDate) {
    throw new Error(
      "Exam end date must be on or after the start date.",
    );
  }
}

function validateExamName(name: string) {
  const trimmed = name.trim();

  if (!trimmed) {
    throw new Error("Exam name is required.");
  }

  if (trimmed.length > 100) {
    throw new Error(
      "Exam name must be 100 characters or less.",
    );
  }

  return trimmed;
}

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
            section: true,
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
    const name = validateExamName(data.name);

    validateExamDates(
      data.startDate,
      data.endDate,
    );

    /*
     * Academic year must belong
     * to the current school.
     */
    const academicYear =
      await prisma.academicYear.findFirst({
        where: {
          id: data.academicYearId,
          schoolId,
        },

        select: {
          id: true,
        },
      });

    if (!academicYear) {
      throw new Error(
        "Academic year not found.",
      );
    }

    /*
     * Prevent duplicate exam names
     * within the same academic year.
     *
     * Prisma also enforces:
     * @@unique([schoolId, academicYearId, name])
     */
    const existing =
      await prisma.exam.findFirst({
        where: {
          schoolId,
          academicYearId:
            data.academicYearId,
          name,
        },

        select: {
          id: true,
        },
      });

    if (existing) {
      throw new Error(
        "An exam with this name already exists for the selected academic year.",
      );
    }

    return prisma.exam.create({
      data: {
        schoolId,

        academicYearId:
          data.academicYearId,

        name,

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
    /*
     * Always locate the exam
     * inside the current school.
     */
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

    const name =
      data.name !== undefined
        ? validateExamName(data.name)
        : exam.name;

    const startDate =
      data.startDate !== undefined
        ? data.startDate
        : exam.startDate;

    const endDate =
      data.endDate !== undefined
        ? data.endDate
        : exam.endDate;

    /*
     * Validate the complete resulting
     * date range, not only the changed field.
     */
    validateExamDates(
      startDate,
      endDate,
    );

    /*
     * Check duplicate name only when
     * the name is being changed.
     */
    if (
      data.name !== undefined &&
      name.toLowerCase() !==
        exam.name.toLowerCase()
    ) {
      const duplicate =
        await prisma.exam.findFirst({
          where: {
            schoolId,
            academicYearId:
              exam.academicYearId,
            name,

            NOT: {
              id: exam.id,
            },
          },

          select: {
            id: true,
          },
        });

      if (duplicate) {
        throw new Error(
          "An exam with this name already exists for the selected academic year.",
        );
      }
    }

    return prisma.exam.update({
      where: {
        id: exam.id,
      },

      data: {
        name,

        startDate,

        endDate,
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
    /*
     * Tenant-safe lookup first.
     */
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