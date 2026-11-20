import { requireExamPerformanceAccess } from "@/features/exams/services/exam-performance-access";
import { subjectPerformanceService } from "@/features/exams/services/subject-performance.service";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ examId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return apiHandler(async () => {
    const { schoolId, role, teacherScope } = await requireExamPerformanceAccess();
    const { examId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const classId = searchParams.get("classId")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim() || null;
    const teacherId = searchParams.get("teacherId")?.trim() || null;
    if (!classId) return ApiResponse.error("Select a class to view subject performance.", 400);

    const selectedTeacherScope = role !== "TEACHER" && teacherId
      ? await prisma.teacherAllocation.findMany({
          where: { schoolId, teacherId, active: true },
          select: {
            academicYearId: true,
            classId: true,
            sectionId: true,
            subjectId: true,
          },
        })
      : teacherScope;

    return ApiResponse.success(await subjectPerformanceService.get({
      examId,
      schoolId,
      classId,
      sectionId,
      teacherScope: selectedTeacherScope,
    }));
  });
}
