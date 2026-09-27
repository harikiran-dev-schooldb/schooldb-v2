import { NextResponse } from "next/server";

import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    examId: string;
    studentId: string;
  }>;
};

type ResultStatus = "PENDING" | "PASS" | "FAIL" | "ABSENT" | "EXEMPTED";

export async function GET(
  _request: Request,
  context: RouteContext,
) {
  try {
    const { examId, studentId } = await context.params;

    const tenant = await requireTenant();

    /* ------------------------------------------------------------------ */
    /* SCHOOL                                                             */
    /* ------------------------------------------------------------------ */

    const school = await prisma.school.findFirst({
      where: {
        id: tenant.schoolId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logo: true,
      },
    });

    if (!school) {
      return NextResponse.json(
        {
          success: false,
          message: "School not found.",
        },
        { status: 404 },
      );
    }

    /* ------------------------------------------------------------------ */
    /* EXAM                                                               */
    /* ------------------------------------------------------------------ */

    const exam = await prisma.exam.findFirst({
      where: {
        id: examId,
        schoolId: tenant.schoolId,
      },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
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
      return NextResponse.json(
        {
          success: false,
          message: "Exam not found.",
        },
        { status: 404 },
      );
    }

    /* ------------------------------------------------------------------ */
    /* STUDENT                                                            */
    /* ------------------------------------------------------------------ */

    const student = await prisma.student.findFirst({
      where: {
        id: studentId,
        schoolId: tenant.schoolId,
      },
      select: {
        id: true,
        admissionNo: true,
        fullName: true,
      },
    });

    if (!student) {
      return NextResponse.json(
        {
          success: false,
          message: "Student not found.",
        },
        { status: 404 },
      );
    }

    /* ------------------------------------------------------------------ */
    /* STUDENT ENROLLMENT                                                 */
    /*                                                                      */
    /* The student's class/section must come from the enrollment for the   */
    /* same academic year as the exam.                                    */
    /* ------------------------------------------------------------------ */

    const enrollment =
      await prisma.studentEnrollment.findFirst({
        where: {
          schoolId: tenant.schoolId,
          studentId: student.id,
          academicYearId: exam.academicYearId,
        },

        select: {
          id: true,
          academicYearId: true,

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
        },
      });

    if (!enrollment) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Student is not enrolled for this exam's academic year.",
        },
        { status: 404 },
      );
    }

    /* ------------------------------------------------------------------ */
    /* APPLICABLE EXAM SCHEDULES                                          */
    /*                                                                    */
    /* Results are calculated ONLY from ExamSchedule rows that apply to   */
    /* this student's class/section. ClassSubject is not part of result   */
    /* calculation. A section-specific schedule overrides an all-sections */
    /* schedule for the same subject.                                     */
    /* ------------------------------------------------------------------ */

    const schedules = await prisma.examSchedule.findMany({
      where: {
        schoolId: tenant.schoolId,
        examId: exam.id,
        classId: enrollment.class.id,
        OR: [
          { sectionId: enrollment.section.id },
          { sectionId: null },
        ],
      },
      select: {
        id: true,
        sectionId: true,
        examDate: true,
        maxMarks: true,
        passMarks: true,
        subject: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [
        { examDate: "asc" },
        { subject: { name: "asc" } },
      ],
    });

    const sectionSpecificSubjectIds = new Set(
      schedules
        .filter((schedule) => schedule.sectionId === enrollment.section.id)
        .map((schedule) => schedule.subject.id),
    );

    const applicableSchedules = schedules.filter(
      (schedule) =>
        schedule.sectionId !== null ||
        !sectionSpecificSubjectIds.has(schedule.subject.id),
    );

    /* ------------------------------------------------------------------ */
    /* STUDENT MARKS                                                      */
    /* ------------------------------------------------------------------ */

    const marks = applicableSchedules.length
      ? await prisma.studentExamMark.findMany({
          where: {
            schoolId: tenant.schoolId,
            studentEnrollmentId: enrollment.id,
            examScheduleId: {
              in: applicableSchedules.map((schedule) => schedule.id),
            },
          },
          select: {
            examScheduleId: true,
            marksObtained: true,
            status: true,
            remarks: true,
          },
        })
      : [];

    const markByScheduleId = new Map(
      marks.map((mark) => [mark.examScheduleId, mark]),
    );

    /* ------------------------------------------------------------------ */
    /* SUBJECT RESULTS                                                    */
    /* ------------------------------------------------------------------ */

    const subjects = applicableSchedules.map((schedule) => {
      const mark = markByScheduleId.get(schedule.id);

      const maxMarks = Number(schedule.maxMarks);

      const passMarks =
        schedule.passMarks !== null
          ? Number(schedule.passMarks)
          : null;

      const marksObtained =
        mark?.marksObtained !== null &&
        mark?.marksObtained !== undefined
          ? Number(mark.marksObtained)
          : null;

      let resultStatus: ResultStatus;

      if (!mark) {
        resultStatus = "PENDING";
      } else if (mark.status === "ABSENT") {
        resultStatus = "ABSENT";
      } else if (mark.status === "EXEMPTED") {
        resultStatus = "EXEMPTED";
      } else if (
        marksObtained !== null &&
        (passMarks === null ||
          marksObtained >= passMarks)
      ) {
        resultStatus = "PASS";
      } else {
        resultStatus = "FAIL";
      }

      return {
        scheduleId: schedule.id,

        subject: schedule.subject,

        class: enrollment.class,

        section: enrollment.section,

        examDate: schedule.examDate,

        maxMarks,
        passMarks,
        marksObtained,

        status: mark?.status ?? "PENDING",

        resultStatus,

        remarks: mark?.remarks ?? null,
      };
    });

    /* ------------------------------------------------------------------ */
    /* EXAM DATE LIMIT                                                    */
    /* ------------------------------------------------------------------ */

    const subjectDates = subjects.map(
      (subject) =>
        new Date(subject.examDate).getTime(),
    );

    const examDateLimit =
      subjectDates.length > 0
        ? new Date(Math.max(...subjectDates))
        : exam.endDate ?? exam.startDate;

    /* ------------------------------------------------------------------ */
    /* ATTENDANCE                                                         */
    /* ------------------------------------------------------------------ */

    let totalAttendanceDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let attendancePercentage = 0;

    if (examDateLimit) {
      const attendanceRecords =
        await prisma.attendance.findMany({
          where: {
            schoolId: tenant.schoolId,

            studentId: student.id,

            session: {
              schoolId: tenant.schoolId,
              academicYearId:
                exam.academicYearId,

              attendanceDate: {
                lte: examDateLimit,
              },
            },
          },

          select: {
            status: true,

            session: {
              select: {
                attendanceDate: true,
              },
            },
          },

          orderBy: {
            session: {
              attendanceDate: "asc",
            },
          },
        });

      /*
       * Multiple attendance sessions may exist
       * on the same date.
       *
       * Count one actual attendance day.
       */
      const attendanceByDate =
        new Map<string, string[]>();

      for (const attendance of attendanceRecords) {
        const dateKey = new Date(
          attendance.session.attendanceDate,
        )
          .toISOString()
          .slice(0, 10);

        const statuses =
          attendanceByDate.get(dateKey);

        if (statuses) {
          statuses.push(attendance.status);
        } else {
          attendanceByDate.set(dateKey, [
            attendance.status,
          ]);
        }
      }

      totalAttendanceDays =
        attendanceByDate.size;

      for (const statuses of attendanceByDate.values()) {
        const present =
          statuses.includes("PRESENT") ||
          statuses.includes("LATE");

        if (present) {
          presentDays += 1;
        } else {
          absentDays += 1;
        }
      }

      attendancePercentage =
        totalAttendanceDays > 0
          ? Number(
              (
                (presentDays /
                  totalAttendanceDays) *
                100
              ).toFixed(2),
            )
          : 0;
    }

    /* ------------------------------------------------------------------ */
    /* OVERALL RESULT                                                     */
    /* ------------------------------------------------------------------ */

    const gradedSubjects = subjects.filter(
      (subject) =>
        subject.resultStatus === "PASS" ||
        subject.resultStatus === "FAIL",
    );

    /*
     * Every scheduled subject contributes to the maximum marks unless it is
     * explicitly exempted. Missing marks remain PENDING and must not make the
     * student appear to have a completed result.
     */
    const totalMaxMarks =
      subjects.reduce(
        (total, subject) =>
          subject.resultStatus === "EXEMPTED"
            ? total
            : total + subject.maxMarks,
        0,
      );

    const totalObtained =
      subjects.reduce(
        (total, subject) =>
          total +
          (subject.resultStatus === "PASS" ||
          subject.resultStatus === "FAIL"
            ? subject.marksObtained ?? 0
            : 0),
        0,
      );

    const passedSubjects =
      subjects.filter(
        (subject) =>
          subject.resultStatus === "PASS",
      ).length;

    const failedSubjects =
      subjects.filter(
        (subject) =>
          subject.resultStatus === "FAIL",
      ).length;

    const absentSubjects =
      subjects.filter(
        (subject) =>
          subject.resultStatus === "ABSENT",
      ).length;

    const exemptedSubjects =
      subjects.filter(
        (subject) =>
          subject.resultStatus === "EXEMPTED",
      ).length;

    const pendingSubjects =
      subjects.filter(
        (subject) =>
          subject.resultStatus === "PENDING",
      ).length;

    const percentage =
      totalMaxMarks > 0
        ? Number(
            (
              (totalObtained /
                totalMaxMarks) *
              100
            ).toFixed(2),
          )
        : 0;

    /*
     * Only subjects in ExamSchedule are considered.
     *
     * A scheduled subject without a mark is PENDING.
     * EXEMPTED subjects do not fail the student.
     * ABSENT subjects do fail the overall result.
     */
    const overallStatus =
      subjects.length === 0
        ? "NO_RESULT"
        : pendingSubjects > 0
          ? "PENDING"
          : failedSubjects > 0 ||
              absentSubjects > 0
            ? "FAIL"
            : "PASS";

    /* ------------------------------------------------------------------ */
    /* RESPONSE                                                           */
    /* ------------------------------------------------------------------ */

    return NextResponse.json({
      success: true,

      data: {
        school,

        exam: {
          id: exam.id,
          name: exam.name,
          startDate: exam.startDate,
          endDate: exam.endDate,
          academicYear: exam.academicYear,
        },

        student,

        enrollment: {
          id: enrollment.id,
          academicYearId:
            enrollment.academicYearId,
          class: enrollment.class,
          section: enrollment.section,
        },

        summary: {
          totalSubjects: subjects.length,

          gradedSubjects:
            gradedSubjects.length,

          passedSubjects,

          failedSubjects,

          absentSubjects,

          exemptedSubjects,

          pendingSubjects,

          totalObtained,

          totalMaxMarks,

          percentage,

          status: overallStatus,

          attendance: {
            upToDate: examDateLimit,

            totalDays:
              totalAttendanceDays,

            presentDays,

            absentDays,

            percentage:
              attendancePercentage,
          },
        },

        subjects,
      },
    });
  } catch (error) {
    console.error(
      "Failed to load student exam result:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to load student exam result.",
      },
      { status: 500 },
    );
  }
}