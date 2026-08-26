import { NextResponse } from "next/server";

import { requireTenant } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{
    examId: string;
    studentId: string;
  }>;
};

type ResultStatus = "PASS" | "FAIL" | "ABSENT" | "EXEMPTED";

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
    /* STUDENT MARKS                                                      */
    /* ------------------------------------------------------------------ */

    const marks =
      await prisma.studentExamMark.findMany({
        where: {
          schoolId: tenant.schoolId,

          studentEnrollmentId: enrollment.id,

          examSchedule: {
            examId: exam.id,
          },
        },

        include: {
          examSchedule: {
            select: {
              id: true,
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
          },
        },

        orderBy: {
          examSchedule: {
            examDate: "asc",
          },
        },
      });

    /* ------------------------------------------------------------------ */
    /* SUBJECT RESULTS                                                    */
    /* ------------------------------------------------------------------ */

    const subjects = marks.map((mark) => {
      const maxMarks = Number(
        mark.examSchedule.maxMarks,
      );

      const passMarks =
        mark.examSchedule.passMarks !== null
          ? Number(mark.examSchedule.passMarks)
          : null;

      const marksObtained =
        mark.marksObtained !== null
          ? Number(mark.marksObtained)
          : null;

      let resultStatus: ResultStatus;

      if (mark.status === "ABSENT") {
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
        scheduleId: mark.examSchedule.id,

        subject: mark.examSchedule.subject,

        class: enrollment.class,

        section: enrollment.section,

        examDate: mark.examSchedule.examDate,

        maxMarks,
        passMarks,
        marksObtained,

        status: mark.status,

        resultStatus,

        remarks: mark.remarks,
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

    const totalMaxMarks =
      gradedSubjects.reduce(
        (total, subject) =>
          total + subject.maxMarks,
        0,
      );

    const totalObtained =
      gradedSubjects.reduce(
        (total, subject) =>
          total +
          (subject.marksObtained ?? 0),
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
     * EXEMPTED subjects do not fail the student.
     *
     * ABSENT subjects do fail the overall result.
     *
     * A student with no marks cannot be declared PASS.
     */
    const overallStatus =
      subjects.length === 0
        ? "NO_RESULT"
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