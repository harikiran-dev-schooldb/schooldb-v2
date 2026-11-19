import { examResultService } from "@/features/exams/services/exam-result.service";
import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

type RouteContext = {
  params: Promise<{ examId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  return apiHandler(async () => {
    const tenant = await requireTenant();
    const { examId } = await context.params;
    const searchParams = new URL(request.url).searchParams;
    const classId = searchParams.get("classId")?.trim();
    const sectionId = searchParams.get("sectionId")?.trim() || null;

    if (!classId) {
      return ApiResponse.error("Select a class to view failures.", 400);
    }

    const result = await examResultService.getFailures({
      examId,
      schoolId: tenant.schoolId,
      classId,
      sectionId,
    });

    return ApiResponse.success(result);
  });
}
