import { StudentExamStatus } from "@/generated/prisma/client";

import { prisma } from "@/lib/prisma";

type MarkInput = {
  studentEnrollmentId: string;
  marksObtained?: number | null;
  status?: StudentExamStatus;
  remarks?: string | null;
};

export const studentExamMarkService = {
  /* ---------------------------------------------------------------------- */
  /* GET STUDENTS + EXISTING MARKS                                          */
  /* ---------------------------------------------------------------------- */

  async listForSchedule(
    scheduleId: string,
    schoolId: string,
    sectionId: string,
  ) {
    const schedule = await prisma.examSchedule.findFirst({
      where: {
        id: scheduleId,
        schoolId,
      },

      include: {
        class: true,
        section: true,
        subject: true,

        exam: {
          include: {
            academicYear: true,
          },
        },
      },
    });

    if (!schedule) {
      throw new Error("Exam schedule not found.");
    }

    /*
     * If the schedule is specifically assigned to a section,
     * the requested section must match that section.
     *
     * If schedule.sectionId is null, the schedule applies
     * to all sections of the class.
     */
    if (schedule.sectionId && schedule.sectionId !== sectionId) {
      throw new Error(
        "Selected section does not match this exam schedule.",
      );
    }

    /*
     * IMPORTANT:
     *
     * Marks entry is section-wise even when the exam schedule
     * is class-wise.
     *
     * Therefore always filter students by the requested sectionId.
     */
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        active: true,
        classId: schedule.classId,
        sectionId,
      },

      include: {
        student: {
          select: {
            id: true,
            admissionNo: true,
            fullName: true,
          },
        },

        examMarks: {
          where: {
            examScheduleId: scheduleId,
          },

          select: {
            id: true,
            marksObtained: true,
            status: true,
            remarks: true,
          },
        },
      },

      orderBy: {
        rollNo: "asc"
      },
    });

    return {
      schedule: {
        id: schedule.id,

        examId: schedule.examId,

        examName: schedule.exam.name,

        academicYear: schedule.exam.academicYear.name,

        class: {
          id: schedule.class.id,
          name: schedule.class.name,
        },

        section: schedule.section
          ? {
              id: schedule.section.id,
              name: schedule.section.name,
            }
          : null,

        subject: {
          id: schedule.subject.id,
          name: schedule.subject.name,
          code: schedule.subject.code,
        },

        examDate: schedule.examDate,

        maxMarks: schedule.maxMarks,

        passMarks: schedule.passMarks,
      },

      students: enrollments.map((enrollment) => {
        const mark = enrollment.examMarks[0] ?? null;

        return {
          studentEnrollmentId: enrollment.id,

          student: {
            id: enrollment.student.id,
            admissionNo: enrollment.student.admissionNo,
            fullName: enrollment.student.fullName,
          },

          rollNo: enrollment.rollNo,

          mark: mark
            ? {
                id: mark.id,
                marksObtained: mark.marksObtained,
                status: mark.status,
                remarks: mark.remarks,
              }
            : {
                id: null,
                marksObtained: null,
                status: StudentExamStatus.PRESENT,
                remarks: null,
              },
        };
      }),
    };
  },

  /* ---------------------------------------------------------------------- */
  /* BULK SAVE / UPDATE MARKS                                               */
  /* ---------------------------------------------------------------------- */

  async saveBulk(
    scheduleId: string,
    schoolId: string,
    sectionId: string,
    marks: MarkInput[],
  ) {
    const schedule = await prisma.examSchedule.findFirst({
      where: {
        id: scheduleId,
        schoolId,
      },

      select: {
        id: true,
        classId: true,
        sectionId: true,
        maxMarks: true,
      },
    });

    if (!schedule) {
      throw new Error("Exam schedule not found.");
    }

    if (!sectionId) {
      throw new Error("Section is required for saving marks.");
    }

    /*
     * If the exam schedule is section-specific,
     * the selected section must match it.
     *
     * If schedule.sectionId is null, the schedule
     * applies to all sections.
     */
    if (schedule.sectionId && schedule.sectionId !== sectionId) {
      throw new Error(
        "Selected section does not match this exam schedule.",
      );
    }

    if (!Array.isArray(marks) || marks.length === 0) {
      throw new Error("No student marks provided.");
    }

    const enrollmentIds = [
      ...new Set(
        marks.map((mark) => mark.studentEnrollmentId),
      ),
    ];

    if (enrollmentIds.length !== marks.length) {
      throw new Error("Duplicate students found in marks data.");
    }

    /*
     * IMPORTANT:
     *
     * Always validate submitted students against:
     *
     *   school
     *   class
     *   selected section
     *   active enrollment
     *
     * This prevents marks from being saved for students
     * belonging to another section.
     */
    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        id: {
          in: enrollmentIds,
        },

        schoolId,
        active: true,
        classId: schedule.classId,
        sectionId,
      },

      select: {
        id: true,
      },
    });

    if (enrollments.length !== enrollmentIds.length) {
      throw new Error(
        "One or more students do not belong to the selected class and section.",
      );
    }

    const maxMarks = Number(schedule.maxMarks);

    const operations = marks.map((input) => {
      const status =
        input.status ?? StudentExamStatus.PRESENT;

      let marksObtained: number | null = null;

      /*
       * Absent students do not receive marks.
       */
      if (status === StudentExamStatus.PRESENT) {
        if (
          input.marksObtained !== undefined &&
          input.marksObtained !== null
        ) {
          marksObtained = Number(input.marksObtained);

          if (!Number.isFinite(marksObtained)) {
            throw new Error("Invalid marks value.");
          }

          if (marksObtained < 0) {
            throw new Error(
              "Marks cannot be less than zero.",
            );
          }

          if (marksObtained > maxMarks) {
            throw new Error(
              `Marks cannot be greater than maximum marks (${maxMarks}).`,
            );
          }
        }
      }

      return prisma.studentExamMark.upsert({
        where: {
          examScheduleId_studentEnrollmentId: {
            examScheduleId: scheduleId,
            studentEnrollmentId: input.studentEnrollmentId,
          },
        },

        create: {
          schoolId,
          examScheduleId: scheduleId,
          studentEnrollmentId: input.studentEnrollmentId,
          marksObtained,
          status,
          remarks: input.remarks || null,
        },

        update: {
          marksObtained,
          status,
          remarks: input.remarks || null,
        },
      });
    });

    const result = await prisma.$transaction(operations);

    return {
      count: result.length,
    };
  },
};