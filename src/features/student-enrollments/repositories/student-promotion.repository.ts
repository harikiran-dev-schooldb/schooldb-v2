import { prisma } from "@/lib/prisma";

export const studentPromotionRepository = {
  async getSourceEnrollments(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId: string,
    studentIds?: string[],
  ) {
    return prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        classId,
        sectionId,
        active: true,

        ...(studentIds?.length
          ? {
              studentId: {
                in: studentIds,
              },
            }
          : {}),
      },

      select: {
        id: true,
        studentId: true,
        rollNo: true,

        student: {
          select: {
            id: true,
            admissionNo: true,
            fullName: true,
            status: true,
          },
        },
      },

      orderBy: [
        {
          rollNo: "asc",
        },
        {
          student: {
            fullName: "asc",
          },
        },
      ],
    });
  },

  async findExistingTargetEnrollments(
    schoolId: string,
    academicYearId: string,
    studentIds: string[],
  ) {
    return prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        studentId: {
          in: studentIds,
        },
      },

      select: {
        id: true,
        studentId: true,
        classId: true,
        sectionId: true,
      },
    });
  },

  async createMany(
    rows: Array<{
      schoolId: string;
      studentId: string;
      academicYearId: string;
      classId: string;
      sectionId: string;
      rollNo: number | null;
      active: boolean;
    }>,
  ) {
    return prisma.$transaction(
      rows.map((row) =>
        prisma.studentEnrollment.create({
          data: {
            school: {
              connect: {
                id: row.schoolId,
              },
            },

            student: {
              connect: {
                id: row.studentId,
              },
            },

            academicYear: {
              connect: {
                id: row.academicYearId,
              },
            },

            class: {
              connect: {
                id: row.classId,
              },
            },

            section: {
              connect: {
                id: row.sectionId,
              },
            },

            rollNo: row.rollNo,
            active: row.active,
          },
        }),
      ),
    );
  },
};