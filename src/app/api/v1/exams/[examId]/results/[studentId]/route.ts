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
    /* Get Student Marks For This Exam                                    */
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
        examSchedule: {
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },

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
        },
      },

      orderBy: {
        examSchedule: {
          examDate: "asc",
        },
      },
    });

    /* ------------------------------------------------------------------ */
    /* Calculate Subject Results                                          */
    /* ------------------------------------------------------------------ */

    const subjects = marks.map((mark) => {
      const maxMarks = Number(mark.examSchedule.maxMarks);

      const passMarks =
        mark.examSchedule.passMarks !== null
          ? Number(mark.examSchedule.passMarks)
          : null;

      const marksObtained =
        mark.marksObtained !== null ? Number(mark.marksObtained) : null;

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

        class: mark.examSchedule.class,

        section: mark.examSchedule.section,

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
    /* Calculate Exam Date Limit                                          */
    /* Use latest scheduled subject exam date.                             */
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
    /* Get Student Enrollment                                             */
    /* Needed for attendance filtering.                                   */
    /* ------------------------------------------------------------------ */

    const enrollment = await prisma.studentEnrollment.findFirst({
      where: {
        schoolId: tenant.schoolId,
        studentId,
        academicYearId: exam.academicYearId,
      },
      select: {
        id: true,
      },
    });

    /* ------------------------------------------------------------------ */
    /* Calculate Attendance                                               */
    /* Attendance counted only up to the latest exam date.                 */
    /* ------------------------------------------------------------------ */

    let totalAttendanceDays = 0;
    let presentDays = 0;
    let absentDays = 0;
    let attendancePercentage = 0;

    if (enrollment && examDateLimit) {
      const attendanceRecords = await prisma.attendance.findMany({
        where: {
          schoolId: tenant.schoolId,

          studentEnrollmentId: enrollment.id,

          date: {
            lte: examDateLimit,
          },
        },

        select: {
          status: true,
        },
      });

      totalAttendanceDays = attendanceRecords.length;

      presentDays = attendanceRecords.filter(
        (attendance) =>
          attendance.status === "PRESENT" ||
          attendance.status === "LATE",
      ).length;

      absentDays = attendanceRecords.filter(
        (attendance) => attendance.status === "ABSENT",
      ).length;

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
    /* Calculate Overall Result                                           */
    /* ------------------------------------------------------------------ */

    const totalMaxMarks = subjects.reduce(
      (total, subject) => total + subject.maxMarks,
      0,
    );

    const totalObtained = subjects.reduce(
      (total, subject) =>
        total + (subject.marksObtained !== null ? subject.marksObtained : 0),
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
        ? Number(((totalObtained / totalMaxMarks) * 100).toFixed(2))
        : 0;

    const overallStatus =
      failedSubjects === 0 && absentSubjects === 0 && subjects.length > 0
        ? "PASS"
        : "FAIL";

    /* ------------------------------------------------------------------ */
    /* Response                                                           */
    /* ------------------------------------------------------------------ */

    return NextResponse.json({
      success: true,

      data: {
        exam,

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