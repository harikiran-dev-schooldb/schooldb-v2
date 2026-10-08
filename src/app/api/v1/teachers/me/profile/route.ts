import { apiHandler } from "@/lib/api";
import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { getTeacherProfile } from "@/features/teachers/services/teacher-profile.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireRole(["TEACHER"]);
    const currentTeacher = await requireCurrentTeacher(tenant.schoolId);
    const teacher = await getTeacherProfile(currentTeacher.id, tenant.schoolId);

    if (!teacher) {
      return ApiResponse.error("Teacher profile not found.", 404);
    }

    return ApiResponse.success(teacher);
  });
}
