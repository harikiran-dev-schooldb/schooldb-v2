import { prisma } from "@/lib/prisma";
import {
  StudentActivityType,
  Prisma,
} from "@/generated/prisma/client";

type CreateActivityInput = {
  schoolId: string;
  studentId: string;

  enrollmentId?: string;

  type: StudentActivityType;

  title: string;

  description?: string;
  metadata?: Prisma.InputJsonValue;
};

export const studentActivityService = {
  async create(input: CreateActivityInput) {
    return prisma.studentActivity.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,

        ...(input.enrollmentId
          ? {
              enrollmentId: input.enrollmentId,
            }
          : {}),

        type: input.type,

        title: input.title,

        description: input.description,

        metadata: input.metadata,
      },
    });
  },

  async list(
    studentId: string,
    schoolId: string,
  ) {
    return prisma.studentActivity.findMany({
      where: {
        studentId,
        schoolId,
      },

      include: {
        enrollment: {
          select: {
            id: true,

            academicYear: {
              select: {
                name: true,
              },
            },

            class: {
              select: {
                name: true,
              },
            },

            section: {
              select: {
                name: true,
              },
            },

            rollNo: true,
          },
        },
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 100,
    });
  },
};