import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      examId: string;
      studentId: string;
    }>;
  },
) {
  try {
    const { examId, studentId } = await params;

    const tenant = await requireTenant();

    if (!tenant) {
      return NextResponse.json(
        {
          success: false,
          message: "Unauthorized.",
        },
        {
          status: 401,
        },
      );
    }

    /* ------------------------------------------------------------------ */
    /* School                                                             */
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
        {
          status: 404,
        },
      );
    }

    /* ------------------------------------------------------------------ */
    /* Verify Exam                                                        */
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
        {
          status: 404,
        },
      );
    }

    /* ------------------------------------------------------------------ */
    /* Verify Student                                                     */
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
        {
          status: 404,
        },
      );
    }

    /* ------------------------------------------------------------------ */
    /* Get Student Marks                                                  */
    /* ------------------------------------------------------------------ */

    const marks = await prisma.studentExamMark.findMany({
  where: {
    schoolId: tenant.schoolId,

    examSchedule: {
      examId,
    },

    studentEnrollment: {
      studentId,
    },
  },

  include: {
    studentEnrollment: {
      select: {
        id: true,

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

        academicYearId: true,
      },
    },

    examSchedule: {
      include: {
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
    /* Subject Results                                                    */
    /* ------------------------------------------------------------------ */

    const subjects = marks.map((mark) => {
      const maxMarks = Number(mark.examSchedule.maxMarks);

      const passMarks =
        mark.examSchedule.passMarks !== null
          ? Number(mark.examSchedule.passMarks)
          : null;

      const marksObtained =
        mark.marksObtained !== null
          ? Number(mark.marksObtained)
          : null;

      let resultStatus: "PASS" | "FAIL" | "ABSENT";

      if (mark.status === "ABSENT") {
        resultStatus = "ABSENT";
      } else if (
        marksObtained !== null &&
        (passMarks === null || marksObtained >= passMarks)
      ) {
        resultStatus = "PASS";
      } else {
        resultStatus = "FAIL";
      }

      return {
  scheduleId: mark.examScheduleId,

  subject: mark.examSchedule.subject,

  class: mark.studentEnrollment.class,

  section: mark.studentEnrollment.section,

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
    /* Exam Date Limit                                                    */
    /* Attendance only up to last exam date                               */
    /* ------------------------------------------------------------------ */

    const examDateLimit =
      subjects.length > 0
        ? new Date(
            Math.max(
              ...subjects.map((subject) =>
                new Date(subject.examDate).getTime(),
              ),
            ),
          )
        : exam.endDate || exam.startDate;

    /* ------------------------------------------------------------------ */
    /* Attendance                                                         */
    /* Group by date so multiple period sessions do not count as days.    */
    /* ------------------------------------------------------------------ */

    let totalAttendanceDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let attendancePercentage = 0;

    if (examDateLimit) {
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          schoolId: tenant.schoolId,

          studentId: student.id,

          session: {
            schoolId: tenant.schoolId,

            academicYearId: exam.academicYearId,

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
       * One student may have multiple attendance sessions on the same day.
       * Group them by date so the report card shows actual days.
       */

      const attendanceByDate = new Map<
        string,
        {
          statuses: string[];
        }
      >();

      for (const attendance of attendanceRecords) {
        const dateKey = new Date(attendance.session.attendanceDate)
          .toISOString()
          .slice(0, 10);

        const existing = attendanceByDate.get(dateKey);

        if (existing) {
          existing.statuses.push(attendance.status);
        } else {
          attendanceByDate.set(dateKey, {
            statuses: [attendance.status],
          });
        }
      }

      totalAttendanceDays = attendanceByDate.size;

      for (const [, attendance] of attendanceByDate) {
        const isPresent =
          attendance.statuses.includes("PRESENT") ||
          attendance.statuses.includes("LATE");

        if (isPresent) {
          presentDays += 1;
        } else {
          absentDays += 1;
        }
      }

      attendancePercentage =
        totalAttendanceDays > 0
          ? Number(
              (
                (presentDays / totalAttendanceDays) *
                100
              ).toFixed(2),
            )
          : 0;
    }

    /* ------------------------------------------------------------------ */
    /* Overall Result                                                     */
    /* ------------------------------------------------------------------ */

    const totalMaxMarks = subjects.reduce(
      (total, subject) => total + subject.maxMarks,
      0,
    );

    const totalObtained = subjects.reduce(
      (total, subject) =>
        total +
        (subject.marksObtained !== null
          ? subject.marksObtained
          : 0),
      0,
    );

    const passedSubjects = subjects.filter(
      (subject) => subject.resultStatus === "PASS",
    ).length;

    const failedSubjects = subjects.filter(
      (subject) => subject.resultStatus === "FAIL",
    ).length;

    const absentSubjects = subjects.filter(
      (subject) => subject.resultStatus === "ABSENT",
    ).length;

    const percentage =
      totalMaxMarks > 0
        ? Number(
            ((totalObtained / totalMaxMarks) * 100).toFixed(2),
          )
        : 0;

    const overallStatus =
      failedSubjects === 0 &&
      absentSubjects === 0 &&
      subjects.length > 0
        ? "PASS"
        : "FAIL";

    /* ------------------------------------------------------------------ */
    /* Response                                                           */
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

        summary: {
          totalSubjects: subjects.length,
          passedSubjects,
          failedSubjects,
          absentSubjects,

          totalObtained,
          totalMaxMarks,

          percentage,

          status: overallStatus,

          attendance: {
            upToDate: examDateLimit,
            totalDays: totalAttendanceDays,
            presentDays,
            absentDays,
            percentage: attendancePercentage,
          },
        },

        subjects,
      },
    });
  } catch (error) {
    console.error("Failed to load student exam result:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load student exam result.",
      },
      {
        status: 500,
      },
    );
  }
}