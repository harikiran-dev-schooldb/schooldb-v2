import { createStaffLeave } from "@/features/operations/service";
import { apiHandler } from "@/lib/api";
import { requireCurrentTeacher, requireRole } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

export async function POST(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireRole(["TEACHER"]);
    const teacher = await requireCurrentTeacher(tenant.schoolId);
    const body = await request.json();
    const leave = await createStaffLeave(
      tenant.schoolId,
      tenant.userId,
      { ...body, teacherId: teacher.id },
    );

    return ApiResponse.success(leave, "Leave request submitted.", 201);
  });
}
