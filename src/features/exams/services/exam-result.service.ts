import { prisma } from "@/lib/prisma";

type GetExamResultsOptions = {
  examId: string;
  schoolId: string;
  classId?: string | null;
  sectionId?: string | null;
};

type GetExamToppersOptions = GetExamResultsOptions & {
  limit: number;
};

type SubjectResultStatus =
  | "PENDING"
  | "PASS"
  | "FAIL"
  | "ABSENT"
  | "EXEMPTED";

type OverallStatus = "PENDING" | "PASS" | "FAIL";

export const examResultService = {
  async getToppers({
    examId,
    schoolId,
    classId,
    sectionId,
    limit,
  }: GetExamToppersOptions) {
    if (!classId) {
      throw new Error("Select a class to view toppers.");
    }

    const safeLimit = Math.min(100, Math.max(1, Math.trunc(limit)));

    const exam = await prisma.exam.findFirst({
      where: { id: examId, schoolId },
      select: {
        id: true,
        name: true,
        status: true,
        academicYearId: true,
        academicYear: { select: { id: true, name: true } },
      },
    });

    if (!exam) {
      throw new Error("Exam not found.");
    }

    const schedules = await prisma.examSchedule.findMany({
      where: {
        examId,
        schoolId,
        classId,
        ...(sectionId
          ? { OR: [{ sectionId }, { sectionId: null }] }
          : {}),
      },
      select: {
        id: true,
        sectionId: true,
        maxMarks: true,
        passMarks: true,
      },
    });

    if (schedules.length === 0) {
      return {
        exam,
        scope: null,
        requestedLimit: safeLimit,
        eligibleStudents: 0,
        pendingStudents: 0,
        toppers: [],
      };
    }

    const [classRecord, sectionRecord, enrollments] = await Promise.all([
      prisma.class.findFirst({
        where: { id: classId, schoolId },
        select: { id: true, name: true },
      }),
      sectionId
        ? prisma.section.findFirst({
            where: { id: sectionId, classId, class: { schoolId } },
            select: { id: true, name: true },
          })
        : Promise.resolve(null),
      prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: exam.academicYearId,
          classId,
          active: true,
          ...(sectionId ? { sectionId } : {}),
        },
        select: {
          id: true,
          sectionId: true,
          rollNo: true,
          section: { select: { id: true, name: true } },
          student: {
            select: {
              id: true,
              admissionNo: true,
              fullName: true,
              imageUrl: true,
            },
          },
          examMarks: {
            where: { examScheduleId: { in: schedules.map(({ id }) => id) } },
            select: {
              examScheduleId: true,
              marksObtained: true,
              status: true,
            },
          },
        },
      }),
    ]);

    if (!classRecord || (sectionId && !sectionRecord)) {
      throw new Error("The selected class or section was not found.");
    }

    const calculated = enrollments.map((enrollment) => {
      const applicableSchedules = schedules.filter(
        (schedule) =>
          schedule.sectionId === null || schedule.sectionId === enrollment.sectionId,
      );
      const marksBySchedule = new Map(
        enrollment.examMarks.map((mark) => [mark.examScheduleId, mark]),
      );

      let totalObtained = 0;
      let totalMaxMarks = 0;
      let pending = false;
      let failedSubjects = 0;

      for (const schedule of applicableSchedules) {
        const mark = marksBySchedule.get(schedule.id);

        if (!mark) {
          pending = true;
          continue;
        }

        if (mark.status === "EXEMPTED") {
          continue;
        }

        totalMaxMarks += Number(schedule.maxMarks);

        if (mark.status === "ABSENT") {
          failedSubjects += 1;
          continue;
        }

        const obtained = Number(mark.marksObtained ?? 0);
        totalObtained += obtained;

        if (schedule.passMarks !== null && obtained < Number(schedule.passMarks)) {
          failedSubjects += 1;
        }
      }

      const percentage =
        totalMaxMarks > 0
          ? Number(((totalObtained / totalMaxMarks) * 100).toFixed(2))
          : 0;

      return {
        studentId: enrollment.student.id,
        admissionNo: enrollment.student.admissionNo,
        fullName: enrollment.student.fullName || "Unnamed Student",
        imageUrl: enrollment.student.imageUrl,
        rollNo: enrollment.rollNo,
        section: enrollment.section,
        subjects: applicableSchedules.length,
        totalObtained,
        totalMaxMarks,
        percentage,
        status: failedSubjects === 0 ? ("PASS" as const) : ("FAIL" as const),
        pending,
      };
    });

    const completed = calculated
      .filter((student) => !student.pending && student.subjects > 0)
      .sort((a, b) => {
        if (b.percentage !== a.percentage) return b.percentage - a.percentage;
        if (b.totalObtained !== a.totalObtained) {
          return b.totalObtained - a.totalObtained;
        }
        return a.fullName.localeCompare(b.fullName);
      });

    let previousPercentage: number | null = null;
    let previousMarks: number | null = null;
    let currentRank = 0;

    const ranked = completed.map((student, index) => {
      if (
        student.percentage !== previousPercentage ||
        student.totalObtained !== previousMarks
      ) {
        currentRank = index + 1;
        previousPercentage = student.percentage;
        previousMarks = student.totalObtained;
      }

      return {
        studentId: student.studentId,
        admissionNo: student.admissionNo,
        fullName: student.fullName,
        imageUrl: student.imageUrl,
        rollNo: student.rollNo,
        section: student.section,
        subjects: student.subjects,
        totalObtained: student.totalObtained,
        totalMaxMarks: student.totalMaxMarks,
        percentage: student.percentage,
        status: student.status,
        rank: currentRank,
      };
    });

    return {
      exam,
      scope: { class: classRecord, section: sectionRecord },
      requestedLimit: safeLimit,
      eligibleStudents: completed.length,
      pendingStudents: calculated.length - completed.length,
      toppers: ranked.filter((student) => student.rank <= safeLimit),
    };
  },

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
