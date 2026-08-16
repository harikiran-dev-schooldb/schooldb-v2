import { NextRequest, NextResponse } from "next/server";


import { prisma } from "@/lib/prisma";
import { requireTenant } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      examId: string;
    }>;
  },
) {
  try {
    const { examId } = await params;

    const classId = request.nextUrl.searchParams.get("classId");
const sectionId = request.nextUrl.searchParams.get("sectionId");

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

    const exam = await prisma.exam.findFirst({
      where: {
  id:examId,
  schoolId: tenant.schoolId,
},
      select: {
        id: true,
        name: true,
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

    const schedules = await prisma.examSchedule.findMany({
      where: {
        examId,
        schoolId: tenant.schoolId,

            ...(classId ? { classId } : {}),
                ...(sectionId ? { sectionId } : {}),


      },
      include: {
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

        marks: {
          include: {
            studentEnrollment: {
              include: {
                student: {
                  select: {
                    id: true,
                    admissionNo: true,
                    fullName: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        examDate: "asc",
      },
    });

    const studentMap = new Map<
      string,
      {
        studentId: string;
        admissionNo: string;
        fullName: string;
        totalObtained: number;
        totalMaxMarks: number;
        subjects: number;
        passedSubjects: number;
        failedSubjects: number;
        absentSubjects: number;
      }
    >();

    for (const schedule of schedules) {
      const maxMarks = Number(schedule.maxMarks);
      const passMarks =
        schedule.passMarks !== null ? Number(schedule.passMarks) : null;

      for (const mark of schedule.marks) {
        const student = mark.studentEnrollment.student;

        if (!studentMap.has(student.id)) {
          studentMap.set(student.id, {
            studentId: student.id,
            admissionNo: student.admissionNo,
            fullName: student.fullName || "Unnamed Student",
            totalObtained: 0,
            totalMaxMarks: 0,
            subjects: 0,
            passedSubjects: 0,
            failedSubjects: 0,
            absentSubjects: 0,
          });
        }

        const result = studentMap.get(student.id);

        if (!result) continue;

        result.subjects += 1;
        result.totalMaxMarks += maxMarks;

        if (mark.status === "ABSENT") {
          result.absentSubjects += 1;
          result.failedSubjects += 1;
          continue;
        }

        const obtained =
          mark.marksObtained !== null ? Number(mark.marksObtained) : 0;

        result.totalObtained += obtained;

        if (passMarks === null || obtained >= passMarks) {
          result.passedSubjects += 1;
        } else {
          result.failedSubjects += 1;
        }
      }
    }

    const results = Array.from(studentMap.values())
      .map((student) => ({
        ...student,

        percentage:
          student.totalMaxMarks > 0
            ? Number(
                (
                  (student.totalObtained / student.totalMaxMarks) *
                  100
                ).toFixed(2),
              )
            : 0,

        status:
          student.failedSubjects === 0 && student.absentSubjects === 0
            ? "PASS"
            : "FAIL",
      }))
      .sort((a, b) => b.percentage - a.percentage)
      .map((student, index) => ({
        ...student,
        rank: index + 1,
      }));

    return NextResponse.json({
      success: true,

      data: {
        exam,

        results,
      },
    });
  } catch (error) {
    console.error("Failed to load exam results:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Failed to load exam results.",
      },
      {
        status: 500,
      },
    );
  }
}