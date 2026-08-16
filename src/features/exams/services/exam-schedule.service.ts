import { prisma } from "@/lib/prisma";

type CreateExamScheduleInput = {
  examId: string;
  classId: string;
  sectionId?: string | null;
  subjectId: string;

  examDate: string;
  startTime?: string | null;
  endTime?: string | null;

  maxMarks: number;
  passMarks?: number | null;
};

type UpdateExamScheduleInput = {
  classId?: string;
  sectionId?: string | null;
  subjectId?: string;

  examDate?: string;
  startTime?: string | null;
  endTime?: string | null;

  maxMarks?: number;
  passMarks?: number | null;
};

export const examScheduleService = {
  async list(examId: string, schoolId: string) {
    return prisma.examSchedule.findMany({
      where: {
        examId,
        schoolId,
      },

      include: {
        class: {
          select: {
            id: true,
            name: true,
          },
        },

        section: {
          select: {
            id: true,
            name: true,
          },
        },

        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },

      orderBy: [
        {
          examDate: "asc",
        },
      ],
    });
  },

  async getById(id: string, schoolId: string) {
    return prisma.examSchedule.findFirst({
      where: {
        id,
        schoolId,
      },

      include: {
        exam: {
          select: {
            id: true,
            name: true,
            academicYearId: true,
          },
        },

        class: {
          select: {
            id: true,
            name: true,
          },
        },

        section: {
          select: {
            id: true,
            name: true,
          },
        },

        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
    });
  },

  async create(
    schoolId: string,
    input: CreateExamScheduleInput,
  ) {
    const exam = await prisma.exam.findFirst({
      where: {
        id: input.examId,
        schoolId,
        active: true,
      },

      select: {
        id: true,
        academicYearId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!exam) {
      throw new Error("Exam not found.");
    }

    const classExists = await prisma.class.findFirst({
      where: {
        id: input.classId,
        schoolId,
        active: true,
      },

      select: {
        id: true,
      },
    });

    if (!classExists) {
      throw new Error("Class not found.");
    }

    if (input.sectionId) {
      const sectionExists = await prisma.section.findFirst({
  where: {
    id: input.sectionId,
    classId: input.classId,
    active: true,
  },

  select: {
    id: true,
  },
});

      if (!sectionExists) {
        throw new Error(
          "Section does not belong to the selected class.",
        );
      }
    }

    const subjectExists = await prisma.subject.findFirst({
      where: {
        id: input.subjectId,
        schoolId,
        active: true,
      },

      select: {
        id: true,
      },
    });

    if (!subjectExists) {
      throw new Error("Subject not found.");
    }

    const examDate = new Date(input.examDate);

    if (Number.isNaN(examDate.getTime())) {
      throw new Error("Invalid exam date.");
    }

    if (
      exam.startDate &&
      examDate < exam.startDate
    ) {
      throw new Error(
        "Exam date cannot be before the exam start date.",
      );
    }

    if (
      exam.endDate &&
      examDate > exam.endDate
    ) {
      throw new Error(
        "Exam date cannot be after the exam end date.",
      );
    }

    if (input.maxMarks <= 0) {
      throw new Error(
        "Maximum marks must be greater than zero.",
      );
    }

    if (
      input.passMarks !== undefined &&
      input.passMarks !== null &&
      input.passMarks < 0
    ) {
      throw new Error(
        "Pass marks cannot be negative.",
      );
    }

    if (
      input.passMarks !== undefined &&
      input.passMarks !== null &&
      input.passMarks > input.maxMarks
    ) {
      throw new Error(
        "Pass marks cannot be greater than maximum marks.",
      );
    }

    return prisma.examSchedule.create({
      data: {
        schoolId,

        examId: input.examId,

        classId: input.classId,

        sectionId:
          input.sectionId || null,

        subjectId: input.subjectId,

        examDate,

        startTime:
          input.startTime || null,

        endTime:
          input.endTime || null,

        maxMarks: input.maxMarks,

        passMarks:
          input.passMarks ?? null,
      },

      include: {
        class: true,
        section: true,
        subject: true,
      },
    });
  },

  async update(
    id: string,
    schoolId: string,
    input: UpdateExamScheduleInput,
  ) {
    const existing =
      await prisma.examSchedule.findFirst({
        where: {
          id,
          schoolId,
        },

        include: {
          exam: {
            select: {
              startDate: true,
              endDate: true,
            },
          },
        },
      });

    if (!existing) {
      throw new Error("Exam schedule not found.");
    }

    const classId =
      input.classId ?? existing.classId;

    if (input.classId) {
      const classExists =
        await prisma.class.findFirst({
          where: {
            id: input.classId,
            schoolId,
            active: true,
          },

          select: {
            id: true,
          },
        });

      if (!classExists) {
        throw new Error("Class not found.");
      }
    }

    const sectionId =
      input.sectionId !== undefined
        ? input.sectionId
        : existing.sectionId;

    if (sectionId) {
      const sectionExists =
  await prisma.section.findFirst({
    where: {
      id: sectionId,
      classId,
      active: true,
    },

    select: {
      id: true,
    },
  });

      if (!sectionExists) {
        throw new Error(
          "Section does not belong to the selected class.",
        );
      }
    }

    if (input.subjectId) {
      const subjectExists =
        await prisma.subject.findFirst({
          where: {
            id: input.subjectId,
            schoolId,
            active: true,
          },

          select: {
            id: true,
          },
        });

      if (!subjectExists) {
        throw new Error("Subject not found.");
      }
    }

    const maxMarks =
      input.maxMarks ?? Number(existing.maxMarks);

    const passMarks =
      input.passMarks !== undefined
        ? input.passMarks
        : existing.passMarks
          ? Number(existing.passMarks)
          : null;

    if (maxMarks <= 0) {
      throw new Error(
        "Maximum marks must be greater than zero.",
      );
    }

    if (
      passMarks !== null &&
      passMarks < 0
    ) {
      throw new Error(
        "Pass marks cannot be negative.",
      );
    }

    if (
      passMarks !== null &&
      passMarks > maxMarks
    ) {
      throw new Error(
        "Pass marks cannot be greater than maximum marks.",
      );
    }

    const examDate =
      input.examDate
        ? new Date(input.examDate)
        : existing.examDate;

    if (Number.isNaN(examDate.getTime())) {
      throw new Error("Invalid exam date.");
    }

    if (
      existing.exam.startDate &&
      examDate < existing.exam.startDate
    ) {
      throw new Error(
        "Exam date cannot be before the exam start date.",
      );
    }

    if (
      existing.exam.endDate &&
      examDate > existing.exam.endDate
    ) {
      throw new Error(
        "Exam date cannot be after the exam end date.",
      );
    }

    return prisma.examSchedule.update({
      where: {
        id,
      },

      data: {
        classId:
          input.classId ?? undefined,

        sectionId:
          input.sectionId !== undefined
            ? input.sectionId
            : undefined,

        subjectId:
          input.subjectId ?? undefined,

        examDate,

        startTime:
          input.startTime !== undefined
            ? input.startTime
            : undefined,

        endTime:
          input.endTime !== undefined
            ? input.endTime
            : undefined,

        maxMarks,

        passMarks,
      },

      include: {
        class: true,
        section: true,
        subject: true,
      },
    });
  },

  async remove(
    id: string,
    schoolId: string,
  ) {
    const existing =
      await prisma.examSchedule.findFirst({
        where: {
          id,
          schoolId,
        },

        select: {
          id: true,
        },
      });

    if (!existing) {
      throw new Error("Exam schedule not found.");
    }

    await prisma.examSchedule.delete({
      where: {
        id,
      },
    });

    return {
      id,
    };
  },
};