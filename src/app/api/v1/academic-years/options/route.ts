import { apiHandler } from "@/lib/api";
import { requireTenant } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { academicYearService } from "@/features/academic-years/services/academic-year.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const years =
      await academicYearService.options(
        tenant.schoolId
      );

    return ApiResponse.success(years);
  });
}
