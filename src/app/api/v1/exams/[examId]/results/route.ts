import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { examResultService } from "@/features/exams/services/exam-result.service";

type RouteContext = {
  params: Promise<{
    examId: string;
  }>;
};

export async function GET(
  request: Request,
  context: RouteContext,
) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const { examId } = await context.params;

    const url = new URL(request.url);

    const classId =
      url.searchParams.get("classId");

    const sectionId =
      url.searchParams.get("sectionId");

    const results =
      await examResultService.getResults({
        examId,
        schoolId: tenant.schoolId,
        classId,
        sectionId,
      });

    return ApiResponse.success(results);
  });
}