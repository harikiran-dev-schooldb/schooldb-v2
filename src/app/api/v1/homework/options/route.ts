import { apiHandler } from "@/lib/api";
import { ApiResponse } from "@/lib/response";
import { requireTenant } from "@/lib/auth";

import { homeworkService } from "@/features/homework/services/homework.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const options =
      await homeworkService.options(
        tenant.schoolId
      );

    return ApiResponse.success(options);
  });
}