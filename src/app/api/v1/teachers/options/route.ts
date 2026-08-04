import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { teacherService } from "@/features/teachers/services/teacher.service";

export async function GET(req: Request) {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const options = await teacherService.options(
      tenant.schoolId
    );

    return ApiResponse.success(options);
  });
}