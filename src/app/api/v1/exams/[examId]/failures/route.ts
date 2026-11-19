import { examResultService } from "@/features/exams/services/exam-result.service";
import { requireExamFailureAccess } from "@/features/exams/services/exam-failure-access";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{ examId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return apiHandler(async () => {
    const { schoolId, teacherScope } = await requireExamFailureAccess();
    const { examId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const classId = searchParams.get("classId")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim() || null;

    if (!classId) {
      return ApiResponse.error("Select a class to view failures.", 400);
    }

    const result = await examResultService.getFailures({
      examId,
      schoolId,
      classId,
      sectionId,
      teacherScope,
    });

    return ApiResponse.success(result);
  });
}
