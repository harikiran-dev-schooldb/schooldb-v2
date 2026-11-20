import { followUpContextSchema } from "@/features/student-follow-ups/student-follow-up";
import { getFollowUpOptions, requireStudentFollowUpAccess } from "@/features/student-follow-ups/student-follow-up.service";
import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const access = await requireStudentFollowUpAccess();
    const params = new URL(request.url).searchParams;
    const input = followUpContextSchema.safeParse({
      studentId: params.get("studentId"),
      source: params.get("source"),
      examId: params.get("examId") ?? undefined,
      academicYearId: params.get("academicYearId") ?? undefined,
    });
    if (!input.success) return ApiResponse.error("Select a student and follow-up source.", 400);
    return ApiResponse.success(await getFollowUpOptions(access, input.data));
  });
}
