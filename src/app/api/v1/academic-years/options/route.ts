import { apiHandler } from "@/lib/api";
import { requireTenant, teacherClassScope } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";

import { academicYearService } from "@/features/academic-years/services/academic-year.service";

export async function GET() {
  return apiHandler(async () => {
    const tenant = await requireTenant();

    const years = await academicYearService.options(tenant.schoolId);

    if (tenant.role === "TEACHER") {
      const scope = await teacherClassScope(tenant.schoolId);
      const allowedYearIds = new Set(scope.map((item) => item.academicYearId));
      return ApiResponse.success(years.filter((year) => allowedYearIds.has(year.id)));
    }

    return ApiResponse.success(years);
  });
}
