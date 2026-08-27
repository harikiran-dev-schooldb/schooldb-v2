import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

export const studentEnrollmentRepository = {
  list(
    where: Prisma.StudentEnrollmentWhereInput,
    options?: {
      skip?: number;
      take?: number;
    },
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

  findById(id: string, schoolId: string) {
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

      include: {
        student: true,
        academicYear: true,
        class: true,
        section: true,
      },
    });
  },

  update(
    id: string,
    schoolId: string,
    data: Prisma.StudentEnrollmentUpdateInput,
  ) {
    return prisma.studentEnrollment.update({
      where: {
        id,
        schoolId,
      },

      data,

      include: {
        student: true,
        academicYear: true,
        class: true,
        section: true,
      },
    });
  },

  findFirst(where: Prisma.StudentEnrollmentWhereInput) {
    return prisma.studentEnrollment.findFirst({
      where,
    });
  },

  options(
  schoolId: string,
  filters?: {
    academicYearId?: string;
    classId?: string;
    sectionId?: string;
  },
) {
  return prisma.studentEnrollment.findMany({
    where: {
      schoolId,
      active: true,

      ...(filters?.academicYearId && {
        academicYearId:
          filters.academicYearId,
      }),

      ...(filters?.classId && {
        classId: filters.classId,
      }),

      ...(filters?.sectionId && {
        sectionId: filters.sectionId,
      }),
    },

    include: {
      student: true,
      class: true,
      section: true,
      academicYear: true,
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

  getAttendanceStudents(
    schoolId: string,
    academicYearId: string,
    classId: string,
    sectionId: string,
  ) {
    return prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        academicYearId,
        classId,
        sectionId,
        active: true,
      },

      include: {
        student: true,
      },

      orderBy: {
        rollNo: "asc",
      },
    });
  },

    async promoteMany(
    schoolId: string,
    input: {
      studentIds: string[];
      sourceAcademicYearId: string;
      sourceClassId: string;
      sourceSectionId: string;
      targetAcademicYearId: string;
      targetClassId: string;
      targetSectionId: string;
    },
  ) {
    return prisma.$transaction(async (tx) => {
      /*
       * --------------------------------------------------------------
       * Find source enrollments
       * --------------------------------------------------------------
       */

      const sourceEnrollments =
        await tx.studentEnrollment.findMany({
          where: {
            schoolId,

            studentId: {
              in: input.studentIds,
            },

            academicYearId:
              input.sourceAcademicYearId,

            classId:
              input.sourceClassId,

            sectionId:
              input.sourceSectionId,

            active: true,
          },

          include: {
            student: true,
            academicYear: true,
            class: true,
            section: true,
          },

          orderBy: {
            rollNo: "asc",
          },
        });

      /*
       * --------------------------------------------------------------
       * Existing target enrollments
       * --------------------------------------------------------------
       */

      const existingTarget =
        await tx.studentEnrollment.findMany({
          where: {
            schoolId,

            academicYearId:
              input.targetAcademicYearId,

            studentId: {
              in: input.studentIds,
            },
          },

          select: {
            studentId: true,
          },
        });

      const existingStudentIds =
        new Set(
          existingTarget.map(
            (item) => item.studentId,
          ),
        );

      /*
       * --------------------------------------------------------------
       * Find current highest roll number
       * --------------------------------------------------------------
       */

      const highestRoll =
        await tx.studentEnrollment.findFirst({
          where: {
            schoolId,

            academicYearId:
              input.targetAcademicYearId,

            classId:
              input.targetClassId,

            sectionId:
              input.targetSectionId,

            rollNo: {
              not: null,
            },
          },

          orderBy: {
            rollNo: "desc",
          },

          select: {
            rollNo: true,
          },
        });

      let nextRollNo =
        (highestRoll?.rollNo ?? 0) + 1;

      const created = [];
      const skipped: Array<{
        studentId: string;
        admissionNo: string;
        fullName: string | null;
        reason: string;
      }> = [];

      /*
       * --------------------------------------------------------------
       * Promote students
       * --------------------------------------------------------------
       */

      for (const source of sourceEnrollments) {
        if (
          existingStudentIds.has(
            source.studentId,
          )
        ) {
          skipped.push({
            studentId:
              source.studentId,

            admissionNo:
              source.student.admissionNo,

            fullName:
              source.student.fullName,

            reason:
              "Student is already enrolled in the target academic year.",
          });

          continue;
        }

        const target =
          await tx.studentEnrollment.create({
            data: {
              school: {
                connect: {
                  id: schoolId,
                },
              },

              student: {
                connect: {
                  id: source.studentId,
                },
              },

              academicYear: {
                connect: {
                  id: input.targetAcademicYearId,
                },
              },

              class: {
                connect: {
                  id: input.targetClassId,
                },
              },

              section: {
                connect: {
                  id: input.targetSectionId,
                },
              },

              rollNo: nextRollNo,

              admissionDate:
                source.admissionDate,

              active: true,

              promotedFrom: {
                connect: {
                  id: source.id,
                },
              },
            },

            include: {
              student: true,
              academicYear: true,
              class: true,
              section: true,
            },
          });

        created.push(target);

        nextRollNo += 1;

        /*
         * Prevent duplicate processing inside
         * the same request.
         */
        existingStudentIds.add(
          source.studentId,
        );
      }

      return {
        created,
        skipped,
      };
    });
  },
};