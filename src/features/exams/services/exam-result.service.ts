import { prisma } from "@/lib/prisma";

type GetExamResultsOptions = {
  examId: string;
  schoolId: string;
  classId?: string | null;
  sectionId?: string | null;
};

type SubjectResultStatus =
  | "PENDING"
  | "PASS"
  | "FAIL"
  | "ABSENT"
  | "EXEMPTED";

type OverallStatus = "PENDING" | "PASS" | "FAIL";

export const examResultService = {
  async getResults({
    examId,
    schoolId,
    classId,
    sectionId,
  }: GetExamResultsOptions) {
    /*
     * ----------------------------------------------------------------------
     * FIND EXAM
     * ----------------------------------------------------------------------
     */

    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId,
      },

      select: {
        id: true,
        name: true,
        academicYearId: true,

        academicYear: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!exam) {
      throw new Error("Exam not found.");
    }

    /*
     * ----------------------------------------------------------------------
     * FIND EXAM SCHEDULES
     *
     * A schedule with sectionId = null applies to all sections
     * of that class.
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
     * FIND STUDENTS FROM ENROLLMENTS
     *
     * Important:
     * Enrollment must belong to the SAME academic year as the exam.
     * ----------------------------------------------------------------------
     */

    const scheduledClassIds = [
      ...new Set(
        schedules.map((schedule) => schedule.classId),
      ),
    ];

    const enrollments =
      await prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: exam.academicYearId,
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
                in: schedules.map(
                  (schedule) => schedule.id,
                ),
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
     * BUILD STUDENT RESULTS
     * ----------------------------------------------------------------------
     */

    const results = enrollments.map(
      (enrollment) => {
        let totalObtained = 0;

        let subjects = 0;
        let passedSubjects = 0;
        let failedSubjects = 0;
        let absentSubjects = 0;
        let pendingSubjects = 0;
        let exemptedSubjects = 0;

        const subjectResults =
          schedules
            .filter(
              (schedule) =>
                schedule.classId ===
                  enrollment.classId &&
                (!schedule.sectionId ||
                  schedule.sectionId ===
                    enrollment.sectionId),
            )
            .map((schedule) => {
              const mark =
                enrollment.examMarks.find(
                  (item) =>
                    item.examScheduleId ===
                    schedule.id,
                );

              const maxMarks = Number(
                schedule.maxMarks,
              );

              const passMarks =
                schedule.passMarks !== null
                  ? Number(schedule.passMarks)
                  : null;

              const marksObtained =
                mark?.marksObtained !== null &&
                mark?.marksObtained !==
                  undefined
                  ? Number(
                      mark.marksObtained,
                    )
                  : null;

              subjects += 1;

              let subjectStatus: SubjectResultStatus;

              /*
               * No mark entered.
               */

              if (!mark) {
                subjectStatus = "PENDING";
                pendingSubjects += 1;
              }

              /*
               * Absent.
               */

              else if (
                mark.status === "ABSENT"
              ) {
                subjectStatus = "ABSENT";
                absentSubjects += 1;
                failedSubjects += 1;
              }

              /*
               * Exempted.
               *
               * Exempted is not counted as pass or fail.
               * It also does not contribute marks.
               */

              else if (
                mark.status === "EXEMPTED"
              ) {
                subjectStatus = "EXEMPTED";
                exemptedSubjects += 1;
              }

              /*
               * Present.
               */

              else {
                const obtained =
                  marksObtained ?? 0;

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

                class: schedule.class,

                section: schedule.section,

                examDate:
                  schedule.examDate,

                marksObtained,

                maxMarks,

                passMarks,

                status: subjectStatus,

                remarks:
                  mark?.remarks ?? null,
              };
            });

        /*
         * ------------------------------------------------------------------
         * PERCENTAGE
         * ------------------------------------------------------------------
         *
         * Exempted subjects remain part of the subject list but their
         * maximum marks are excluded from the percentage denominator.
         */

        const percentageMaxMarks =
          subjectResults.reduce(
            (total, subject) =>
              subject.status === "EXEMPTED"
                ? total
                : total + subject.maxMarks,
            0,
          );

        const percentage =
          percentageMaxMarks > 0
            ? Number(
                (
                  (totalObtained /
                    percentageMaxMarks) *
                  100
                ).toFixed(2),
              )
            : 0;

        /*
         * ------------------------------------------------------------------
         * OVERALL STATUS
         * ------------------------------------------------------------------
         */

        let status: OverallStatus;

        if (pendingSubjects > 0) {
          status = "PENDING";
        } else if (failedSubjects === 0) {
          status = "PASS";
        } else {
          status = "FAIL";
        }

        return {
          studentId:
            enrollment.student.id,

          studentEnrollmentId:
            enrollment.id,

          admissionNo:
            enrollment.student.admissionNo,

          fullName:
            enrollment.student.fullName ||
            "Unnamed Student",

          classId:
            enrollment.classId,

          sectionId:
            enrollment.sectionId,

          totalObtained,

          totalMaxMarks:
            percentageMaxMarks,

          subjects,

          passedSubjects,

          failedSubjects,

          absentSubjects,

          pendingSubjects,

          exemptedSubjects,

          percentage,

          status,

          subjectResults,
        };
      },
    );

    /*
     * ----------------------------------------------------------------------
     * RANK
     * ----------------------------------------------------------------------
     *
     * Only completed results participate.
     *
     * Students with PENDING results are not ranked.
     */

    const rankedResults = [...results]
      .filter(
        (student) =>
          student.status !== "PENDING",
      )
      .sort((a, b) => {
        if (
          b.percentage !==
          a.percentage
        ) {
          return (
            b.percentage -
            a.percentage
          );
        }

        return (
          b.totalObtained -
          a.totalObtained
        );
      });

    /*
     * Competition ranking:
     *
     * 1
     * 2
     * 2
     * 4
     *
     * Students with the same percentage and marks
     * receive the same rank.
     */

    const rankMap = new Map<
      string,
      number
    >();

    let previousPercentage:
      | number
      | null = null;

    let previousMarks:
      | number
      | null = null;

    let currentRank = 0;

    rankedResults.forEach(
      (student, index) => {
        if (
          previousPercentage !==
            student.percentage ||
          previousMarks !==
            student.totalObtained
        ) {
          currentRank = index + 1;

          previousPercentage =
            student.percentage;

          previousMarks =
            student.totalObtained;
        }

        rankMap.set(
          student.studentId,
          currentRank,
        );
      },
    );

    /*
     * ----------------------------------------------------------------------
     * FINAL RESPONSE
     * ----------------------------------------------------------------------
     */

    return {
      exam,

      schedules,

      results: [...results]
        .sort((a, b) =>
          a.fullName.localeCompare(
            b.fullName,
          ),
        )
        .map((student) => ({
          ...student,

          rank:
            rankMap.get(
              student.studentId,
            ) ?? null,
        })),
    };
  },
};