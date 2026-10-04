import { apiHandler } from "@/lib/api";
import { requireTenant, teacherClassScope } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { classService } from "@/features/classes/services/class.service";

export async function GET(request: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const params = new URL(request.url).searchParams;
    const teacherScope = tenant.role === "TEACHER"
      ? await teacherClassScope(tenant.schoolId)
      : undefined;
    const classes = await classService.options(tenant.schoolId, {
      syllabusId: params.get("syllabusId") ?? undefined,
      branchId: params.get("branchId") ?? undefined,
      classIds: teacherScope ? [...new Set(teacherScope.map((item) => item.classId))] : undefined,
    });

    return ApiResponse.success(classes);
  });
}
