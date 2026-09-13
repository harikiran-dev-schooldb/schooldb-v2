import { NextRequest } from "next/server";

import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { apiHandler } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const membership = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(membership.schoolId);

    const { searchParams } = request.nextUrl;
    const academicYearId = searchParams.get("academicYearId")?.trim();
    const classId = searchParams.get("classId")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim();

    if (!academicYearId || !classId || !sectionId) {
      return ApiResponse.error(
        "academicYearId, classId and sectionId are required.",
        400,
      );
    }

    const allocation = await prisma.teacherAllocation.findFirst({
      where: {
        schoolId: membership.schoolId,
        academicYearId,
        teacherId: teacher.id,
        classId,
        sectionId,
        active: true,
      },
      select: { id: true },
    });

    if (!allocation) {
      return ApiResponse.error(
        "You are not assigned to this class and section.",
        403,
      );
    }

    const enrollments = await prisma.studentEnrollment.findMany({
      where: {
        schoolId: membership.schoolId,
        academicYearId,
        classId,
        sectionId,
        active: true,
        student: { status: "ACTIVE" },
      },
      orderBy: [
        { rollNo: "asc" },
        { student: { fullName: "asc" } },
      ],
      select: {
        id: true,
        rollNo: true,
        studentId: true,
        student: {
          select: {
            admissionNo: true,
            fullName: true,
            imageUrl: true,
            status: true,
          },
        },
      },
    });

    return ApiResponse.success({
      students: enrollments.map((enrollment) => ({
        enrollmentId: enrollment.id,
        studentId: enrollment.studentId,
        admissionNo: enrollment.student.admissionNo,
        fullName:
          enrollment.student.fullName?.trim() ||
          enrollment.student.admissionNo,
        rollNo: enrollment.rollNo,
        imageUrl: enrollment.student.imageUrl,
        status: enrollment.student.status,
      })),
    });
  });
}
