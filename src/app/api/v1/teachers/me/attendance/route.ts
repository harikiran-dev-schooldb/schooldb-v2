import { apiHandler } from "@/lib/api";
import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(tenant.schoolId);
    const requestedYearId = new URL(request.url).searchParams.get("academicYearId");
    const academicYear = await prisma.academicYear.findFirst({
      where: {
        schoolId: tenant.schoolId,
        ...(requestedYearId ? { id: requestedYearId } : { active: true }),
      },
      orderBy: { startDate: "desc" },
      select: { id: true, name: true, startDate: true, endDate: true },
    });

    if (!academicYear) {
      return ApiResponse.error("Academic year not found.", 404);
    }

    const records = await prisma.staffAttendance.findMany({
      where: {
        schoolId: tenant.schoolId,
        teacherId: teacher.id,
        date: { gte: academicYear.startDate, lte: academicYear.endDate },
      },
      orderBy: { date: "desc" },
      take: 366,
    });

    return ApiResponse.success({ academicYear, records });
  });
}
