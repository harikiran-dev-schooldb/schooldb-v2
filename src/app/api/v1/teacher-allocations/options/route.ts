import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { teacherAllocationService } from "@/features/teacher-allocations/services/teacher-allocation.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const options =
      await teacherAllocationService.options(
        tenant.schoolId
      );

    return ApiResponse.success(options);
  });
}