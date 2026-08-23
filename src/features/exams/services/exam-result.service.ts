import { prisma } from "@/lib/prisma";

type GetExamResultsOptions = {
  examId: string;
  schoolId: string;
  classId?: string | null;
  sectionId?: string | null;
};

export const examResultService = {
  async getResults({
    examId,
    schoolId,
    classId,
    sectionId,
  }: GetExamResultsOptions) {
    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId,
      },

      select: {
        id: true,
        name: true,
      },
    });

    if (!exam) {
      throw new Error("Exam not found.");
    }

    /*
     * ----------------------------------------------------------------------
     * FIND EXAM SCHEDULES
     *
     * sectionId = null means the schedule applies to ALL sections
     * of the selected class.
     * ----------------------------------------------------------------------
     */

    const schedules = await prisma.examSchedule.findMany({
      where: {
        examId,
        schoolId,

        ...(classId
          ? {
              classId,
            }
          : {}),

        ...(sectionId
          ? {
              OR: [
                {
                  sectionId,
                },
                {
                  sectionId: null,
                },
              ],
            }
          : {}),
      },

      select: {
        id: true,
        classId: true,
        sectionId: true,
        examDate: true,
        maxMarks: true,
        passMarks: true,

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
        {
          subject: {
            name: "asc",
          },
        },
      ],
    });

    if (schedules.length === 0) {
      return {
        exam,
        schedules: [],
        results: [],
      };
    }

    /*
     * ----------------------------------------------------------------------
     * FIND STUDENTS
     *
     * Students are determined from enrollment, NOT from existing marks.
     *
     * Therefore students with no marks entered yet still appear.
     * ----------------------------------------------------------------------
     */

    const scheduledClassIds = [
      ...new Set(schedules.map((schedule) => schedule.classId)),
    ];

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId,
        active: true,

        classId: {
          in: scheduledClassIds,
        },

        ...(sectionId
          ? {
              sectionId,
            }
          : {}),
      },

      select: {
        id: true,

        classId: true,
        sectionId: true,

        student: {
          select: {
            id: true,
            admissionNo: true,
            fullName: true,
          },
        },

        examMarks: {
          where: {
            examScheduleId: {
              in: schedules.map((schedule) => schedule.id),
            },
          },

          select: {
            id: true,
            examScheduleId: true,
            marksObtained: true,
            status: true,
            remarks: true,
          },
        },
      },

      orderBy: {
        student: {
          fullName: "asc",
        },
      },
    });

    /*
     * ----------------------------------------------------------------------
     * BUILD RESULTS
     * ----------------------------------------------------------------------
     */

    const results = enrollments.map((enrollment) => {
      let totalObtained = 0;
      let totalMaxMarks = 0;

      let subjects = 0;
      let passedSubjects = 0;
      let failedSubjects = 0;
      let absentSubjects = 0;

      const subjectResults = schedules
        .filter(
          (schedule) =>
            schedule.classId === enrollment.classId &&
            (!schedule.sectionId ||
              schedule.sectionId === enrollment.sectionId),
        )
        .map((schedule) => {
          const mark = enrollment.examMarks.find(
            (item) => item.examScheduleId === schedule.id,
          );

          const maxMarks = Number(schedule.maxMarks);

          const passMarks =
            schedule.passMarks !== null
              ? Number(schedule.passMarks)
              : null;

          const isAbsent = mark?.status === "ABSENT";

          const marksObtained =
            mark?.marksObtained !== null &&
            mark?.marksObtained !== undefined
              ? Number(mark.marksObtained)
              : null;

          subjects += 1;
          totalMaxMarks += maxMarks;

          let subjectStatus:
            | "PENDING"
            | "PASS"
            | "FAIL"
            | "ABSENT";

          if (!mark) {
            subjectStatus = "PENDING";
          } else if (isAbsent) {
            subjectStatus = "ABSENT";
            absentSubjects += 1;
            failedSubjects += 1;
          } else {
            const obtained = marksObtained ?? 0;

            totalObtained += obtained;

            if (
              passMarks === null ||
              obtained >= passMarks
            ) {
              subjectStatus = "PASS";
              passedSubjects += 1;
            } else {
              subjectStatus = "FAIL";
              failedSubjects += 1;
            }
          }

          return {
            scheduleId: schedule.id,

            subject: {
              id: schedule.subject.id,
              name: schedule.subject.name,
              code: schedule.subject.code,
            },

            marksObtained,

            maxMarks,

            passMarks,

            status: subjectStatus,

            remarks: mark?.remarks ?? null,
          };
        });

      const percentage =
        totalMaxMarks > 0
          ? Number(
              (
                (totalObtained / totalMaxMarks) *
                100
              ).toFixed(2),
            )
          : 0;

      /*
       * A student with subjects not yet entered should not be
       * marked PASS/FAIL prematurely.
       */

      const pendingSubjects = subjectResults.filter(
        (subject) => subject.status === "PENDING",
      ).length;

      let status: "PENDING" | "PASS" | "FAIL";

      if (pendingSubjects > 0) {
        status = "PENDING";
      } else if (
        failedSubjects === 0 &&
        absentSubjects === 0
      ) {
        status = "PASS";
      } else {
        status = "FAIL";
      }

      return {
        studentId: enrollment.student.id,

        studentEnrollmentId: enrollment.id,

        admissionNo: enrollment.student.admissionNo,

        fullName:
          enrollment.student.fullName ||
          "Unnamed Student",

        classId: enrollment.classId,

        sectionId: enrollment.sectionId,

        totalObtained,

        totalMaxMarks,

        subjects,

        passedSubjects,

        failedSubjects,

        absentSubjects,

        pendingSubjects,

        percentage,

        status,

        subjectResults,
      };
    });

    /*
     * ----------------------------------------------------------------------
     * RANK
     *
     * Only completed PASS/FAIL results participate in ranking.
     * Pending students remain unranked.
     * ----------------------------------------------------------------------
     */

    const rankedResults = [...results]
      .filter(
        (student) => student.status !== "PENDING",
      )
      .sort((a, b) => {
        if (b.percentage !== a.percentage) {
          return b.percentage - a.percentage;
        }

        return (
          b.totalObtained -
          a.totalObtained
        );
      });

    const rankMap = new Map<string, number>();

    rankedResults.forEach((student, index) => {
      rankMap.set(
        student.studentId,
        index + 1,
      );
    });

    return {
      exam,

      schedules,

      results: results
        .sort((a, b) =>
          a.fullName.localeCompare(b.fullName),
        )
        .map((student) => ({
          ...student,

          rank:
            rankMap.get(student.studentId) ??
            null,
        })),
    };
  },
};