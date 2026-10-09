import { prisma } from "@/lib/prisma";
import {
  StudentActivityType,
  Prisma,
} from "@/generated/prisma/client";

type CreateActivityInput = {
  schoolId: string;
  studentId: string;

  enrollmentId?: string;
  performedByUserId?: string;
  sourceType?: string;
  sourceId?: string;

  type: StudentActivityType;

  title: string;

  description?: string;
  metadata?: Prisma.InputJsonValue;
};

type StudentActivityClient = Pick<Prisma.TransactionClient, "studentActivity">;

export const studentActivityService = {
  async create(
    input: CreateActivityInput,
    client: StudentActivityClient = prisma,
  ) {
    return client.studentActivity.create({
      data: {
        schoolId: input.schoolId,
        studentId: input.studentId,

        ...(input.enrollmentId
          ? {
              enrollmentId: input.enrollmentId,
            }
          : {}),
        performedByUserId: input.performedByUserId,
        sourceType: input.sourceType,
        sourceId: input.sourceId,

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
    options: { cursor?: string; take?: number } = {},
  ) {
    const take = Math.min(100, Math.max(10, options.take ?? 50));
    return prisma.studentActivity.findMany({
      where: {
        studentId,
        schoolId,
        NOT: {
          type: "ATTENDANCE_MARKED",
          title: "Attendance finalized",
        },
      },

      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
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

      take: take + 1,
      ...(options.cursor ? { cursor: { id: options.cursor }, skip: 1 } : {}),
    });
  },
};
