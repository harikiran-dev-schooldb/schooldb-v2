import { requireExamFailureAccess } from "@/features/exams/services/exam-failure-access";
import { examService } from "@/features/exams/services/exam.service";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

export async function GET() {
  return apiHandler(async () => {
    const { schoolId, teacherScope } = await requireExamFailureAccess();
    const exams = await examService.getFailureOptions(schoolId, teacherScope);
    return ApiResponse.success(exams);
  });
}
