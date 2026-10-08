import { apiHandler } from "@/lib/api";
import { requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { getTeacherProfile } from "@/features/teachers/services/teacher-profile.service";

type Props = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Props) {
  return apiHandler(async () => {
    const tenant = await requireRole(["SUPER_ADMIN", "SCHOOL_ADMIN"]);
    const { id } = await params;
    const teacher = await getTeacherProfile(id, tenant.schoolId);

    if (!teacher) {
      return ApiResponse.error("Teacher not found.", 404);
    }

    return ApiResponse.success(teacher);
  });
}
