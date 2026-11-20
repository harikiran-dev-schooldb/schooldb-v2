import { requireExamPerformanceAccess } from "@/features/exams/services/exam-performance-access";
import { subjectPerformanceService } from "@/features/exams/services/subject-performance.service";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

type RouteContext = { params: Promise<{ examId: string }> };

export async function GET(request: Request, context: RouteContext) {
  return apiHandler(async () => {
    const { schoolId, teacherScope } = await requireExamPerformanceAccess();
    const { examId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const classId = searchParams.get("classId")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim() || null;
    if (!classId) return ApiResponse.error("Select a class to view subject performance.", 400);

    return ApiResponse.success(await subjectPerformanceService.get({
      examId,
      schoolId,
      classId,
      sectionId,
      teacherScope,
    }));
  });
}
